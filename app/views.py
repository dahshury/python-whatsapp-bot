import asyncio
import contextlib
import datetime
import json
import logging
from zoneinfo import ZoneInfo

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import config
from app.decorators.security import verify_signature
from app.i18n import get_message
from app.metrics import (
    CONCURRENT_TASK_LIMIT_REACHED,
    CONCURRENT_TASK_LIMIT_REACHED_BY_REASON,
    INVALID_HTTP_REQUESTS,
    INVALID_HTTP_REQUESTS_BY_REASON,
    WHATSAPP_MESSAGE_FAILURES,
    WHATSAPP_MESSAGE_FAILURES_BY_REASON,
)
from app.services.assistant_functions import (
    cancel_reservation,
    modify_id,
    modify_reservation,
    reserve_time_slot,
    undo_cancel_reservation,
)
from app.services.domain.customer.customer_service import CustomerService
from app.services.llm_service import get_llm_service
from app.utils.realtime import enqueue_broadcast
from app.utils.service_utils import (
    append_message,
    format_enhanced_vacation_message,
    get_all_conversations,
    get_all_reservations,
)
from app.utils.whatsapp_utils import (
    is_valid_whatsapp_message,
    mark_message_as_read,
    send_whatsapp_location,
    send_whatsapp_message,
    send_whatsapp_template,
    test_whatsapp_api_config,
)
from app.utils.whatsapp_utils import process_whatsapp_message as process_whatsapp_message_util

router = APIRouter()
security = HTTPBasic()

# Create a semaphore to limit concurrent background tasks
# Adjust the value based on memory availability (lower for less memory)
MAX_CONCURRENT_TASKS = 10
task_semaphore = asyncio.BoundedSemaphore(MAX_CONCURRENT_TASKS)


@router.get("/webhook")
async def webhook_get(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Handle webhook verification from WhatsApp API.
    """
    if hub_mode and hub_verify_token:
        if hub_mode == "subscribe" and hub_verify_token == config["VERIFY_TOKEN"]:
            logging.info("WEBHOOK_VERIFIED")
            return JSONResponse(content=hub_challenge)
        else:
            logging.info("VERIFICATION_FAILED")
            INVALID_HTTP_REQUESTS.inc()
            with contextlib.suppress(Exception):
                INVALID_HTTP_REQUESTS_BY_REASON.labels(
                    reason="verification_failed",
                    endpoint="/webhook",
                    method="GET",
                ).inc()
            raise HTTPException(status_code=403, detail="Verification failed")
    else:
        logging.info("MISSING_PARAMETER")
        INVALID_HTTP_REQUESTS.inc()
        with contextlib.suppress(Exception):
            INVALID_HTTP_REQUESTS_BY_REASON.labels(
                reason="missing_parameters",
                endpoint="/webhook",
                method="GET",
            ).inc()
        raise HTTPException(status_code=400, detail="Missing parameters")


async def _process_and_release(body, run_llm_function):
    """Process a WhatsApp message and release the semaphore when done."""
    try:
        logging.info("Starting WhatsApp message processing")
        await process_whatsapp_message_util(body, run_llm_function)
        logging.info("WhatsApp message processing completed successfully")
    except Exception as e:
        logging.error(f"ERROR PROCESSING WHATSAPP MESSAGE: {e}", exc_info=True)
        logging.error("=============== FULL ERROR DETAILS ===============")
        import traceback

        logging.error(traceback.format_exc())
        logging.error("=================================================")
    finally:
        # Always release the semaphore, even if processing failed
        task_semaphore.release()


@router.post("/webhook")
async def webhook_post(request: Request, background_tasks: BackgroundTasks, _=Depends(verify_signature)):
    """
    Process incoming webhook events from WhatsApp API.
    """
    try:
        body = await request.json()
        logging.info(f"Request body: {body}")
    except Exception:
        logging.error("Failed to decode JSON")
        INVALID_HTTP_REQUESTS.inc()
        with contextlib.suppress(Exception):
            INVALID_HTTP_REQUESTS_BY_REASON.labels(
                reason="invalid_json",
                endpoint="/webhook",
                method="POST",
            ).inc()
        raise HTTPException(status_code=400, detail="Invalid JSON provided")

    # Check for WhatsApp status update
    if body.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("statuses"):
        logging.info("Received a WhatsApp status update.")

        # Check for failed message delivery status
        statuses = body.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("statuses", [])
        for status in statuses:
            if status.get("status") == "failed":
                logging.warning(f"WhatsApp message delivery failed: {status}")
                WHATSAPP_MESSAGE_FAILURES.inc()
                try:
                    status_reason = (
                        status.get("error", {}).get("title")
                        or status.get("errors", [{}])[0].get("title")
                        or "delivery_failed"
                    )
                    WHATSAPP_MESSAGE_FAILURES_BY_REASON.labels(
                        reason=str(status_reason),
                        message_type="delivery_status",
                    ).inc()
                except Exception:
                    pass

        return JSONResponse(content={"status": "ok"})

    # Process message in background if it's a valid WhatsApp message
    if is_valid_whatsapp_message(body):
        # Best-effort mark incoming message as read ASAP (does not block)
        try:
            msg = body["entry"][0]["changes"][0]["value"]["messages"][0]
            msg_id = msg.get("id")
            if msg_id:
                # Fire-and-forget: schedule without awaiting so webhook responds quickly
                background_tasks.add_task(mark_message_as_read, msg_id)
        except Exception:
            pass
        # Try to acquire semaphore without blocking the response
        if task_semaphore.locked() and task_semaphore._value == 0:
            # Log current semaphore status
            logging.warning(f"Maximum concurrent tasks reached ({MAX_CONCURRENT_TASKS}). Message processing delayed.")
            CONCURRENT_TASK_LIMIT_REACHED.inc()
            with contextlib.suppress(Exception):
                CONCURRENT_TASK_LIMIT_REACHED_BY_REASON.labels(
                    reason="semaphore_saturated",
                    endpoint="/webhook",
                    method="POST",
                ).inc()
            # Still return 200 OK to WhatsApp API to prevent retries
            return JSONResponse(content={"status": "ok", "note": "Processing delayed due to high load"})

        # Log task creation
        try:
            await task_semaphore.acquire()
            llm_service = get_llm_service()
            logging.debug(f"Semaphore acquired. Tasks in progress: {MAX_CONCURRENT_TASKS - task_semaphore._value}")

            background_tasks.add_task(_process_and_release, body, llm_service.run)
        except Exception as e:
            # Make sure to release the semaphore if task creation fails
            if task_semaphore.locked():
                task_semaphore.release()
            logging.error(f"Failed to create background task: {e}")

        return JSONResponse(content={"status": "ok"})
    else:
        logging.warning(f"Unknown webhook payload structure: {body}")
        INVALID_HTTP_REQUESTS.inc()
        with contextlib.suppress(Exception):
            INVALID_HTTP_REQUESTS_BY_REASON.labels(
                reason="unknown_payload",
                endpoint="/webhook",
                method="POST",
            ).inc()
        return JSONResponse(content={"status": "unknown"})


def check_auth(credentials: HTTPBasicCredentials = Depends(security)):
    """
    Validate HTTP Basic Authentication credentials.
    """
    correct_username = config["APP_ID"]
    correct_password = config["APP_SECRET"]
    if credentials.username == correct_username and credentials.password == correct_password:
        return True
    else:
        INVALID_HTTP_REQUESTS.inc()
        with contextlib.suppress(Exception):
            INVALID_HTTP_REQUESTS_BY_REASON.labels(
                reason="unauthorized_access",
                endpoint="/auth",
                method="BASIC",
            ).inc()
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/app")
async def redirect_to_app(request: Request):
    """
    Redirect to the main application URL, preserving query parameters.
    """
    query_params = request.query_params
    redirect_url = config["APP_URL"]
    if query_params:
        redirect_url = f"{redirect_url}?{query_params}"
    return RedirectResponse(url=redirect_url)


@router.post("/whatsapp/message")
async def api_send_whatsapp_message(payload: dict = Body(...)):
    wa_id = payload.get("wa_id")
    text = payload.get("text")
    # Enforce WhatsApp max length on server side as a defense-in-depth measure
    try:
        if not isinstance(text, str):
            return JSONResponse(content={"status": "error", "message": "Invalid text"}, status_code=400)
        if len(text) > 4096:
            return JSONResponse(content={"status": "error", "message": "Message too long (max 4096)"}, status_code=400)
    except Exception:
        return JSONResponse(content={"status": "error", "message": "Invalid text"}, status_code=400)
    response = await send_whatsapp_message(wa_id, text)

    # On success, persist the message and broadcast (only messages sent via WhatsApp should broadcast)
    try:
        ok = False
        if isinstance(response, tuple) or response is None:
            ok = False
        else:
            status = getattr(response, "status_code", 500)
            ok = int(status) < 400
        if ok:
            try:
                now_local = datetime.datetime.now(ZoneInfo(config["TIMEZONE"]))
                date_str = now_local.strftime("%Y-%m-%d")
                time_str = now_local.strftime("%H:%M")
                # Save to database (no broadcast)
                append_message(wa_id, "secretary", text, date_str, time_str)
                # Broadcast notification (only for messages sent via WhatsApp)
                enqueue_broadcast(
                    "conversation_new_message",
                    {"wa_id": wa_id, "role": "secretary", "message": text, "date": date_str, "time": time_str},
                    affected_entities=[wa_id],
                    source=payload.get("_call_source", "assistant"),
                )
            except Exception as persist_err:
                logging.error(f"append_message or broadcast failed after HTTP send: {persist_err}")
    except Exception:
        pass

    if isinstance(response, tuple):
        return JSONResponse(content=response[0], status_code=response[1])
    return JSONResponse(content=response.json())


@router.post("/whatsapp/location")
async def api_send_whatsapp_location(payload: dict = Body(...)):
    wa_id = payload.get("wa_id")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    name = payload.get("name", "")
    address = payload.get("address", "")
    response = await send_whatsapp_location(wa_id, latitude, longitude, name, address)
    if isinstance(response, tuple):
        return JSONResponse(content=response[0], status_code=response[1])
    # Make sure to extract data without closing the response
    if hasattr(response, "json"):
        return JSONResponse(content=response.json())
    # Just return the dict response without accessing the response object directly
    return JSONResponse(content=response)


@router.post("/whatsapp/template")
async def api_send_whatsapp_template(payload: dict = Body(...)):
    wa_id = payload.get("wa_id")
    template_name = payload.get("template_name")
    language = payload.get("language", "en_US")
    components = payload.get("components")
    response = await send_whatsapp_template(wa_id, template_name, language, components)
    if isinstance(response, tuple):
        return JSONResponse(content=response[0], status_code=response[1])
    return JSONResponse(content=response.json())


@router.get("/whatsapp/test-config")
async def api_test_whatsapp_config():
    """Test WhatsApp API configuration and connectivity."""
    success, message, details = await test_whatsapp_api_config()
    return JSONResponse(content={"success": success, "message": message, "details": details})


@router.get("/conversations/{wa_id}")
async def api_get_conversation_by_wa_id(wa_id: str, limit: int = Query(0)):
    """
    Get conversation messages for a specific customer.
    Used for on-demand loading when customer is selected.
    """
    conversations = get_all_conversations(wa_id=wa_id, limit=limit)
    return JSONResponse(content=conversations)


@router.get("/conversations/calendar/events")
async def api_get_calendar_conversation_events(from_date: str = Query(None), to_date: str = Query(None)):
    """
    Get lightweight conversation events for calendar (last message + customer names only).
    Returns only the last message per customer and customer names.
    """
    from app.utils.service_utils import get_calendar_conversation_events

    events = get_calendar_conversation_events(from_date=from_date, to_date=to_date)
    return JSONResponse(content=events)


@router.get("/customers/names")
async def api_get_customer_names():
    """
    Get all customer names for sidebar combobox.
    Returns all customers whether they have reservations or conversations.
    """
    from app.utils.service_utils import get_all_customer_names

    names = get_all_customer_names()
    return JSONResponse(content=names)


@router.get("/customers/{wa_id}/stats")
async def api_get_customer_stats(wa_id: str):
    """Return aggregated statistics for a specific customer."""
    service = CustomerService()
    result = service.get_customer_stats(wa_id)
    if isinstance(result, tuple):
        payload, status_code = result
        return JSONResponse(content=payload, status_code=status_code)
    return JSONResponse(content=result)


@router.post("/conversations/{wa_id}")
async def api_append_message(wa_id: str, payload: dict = Body(...)):
    # Just append to DB, no broadcast (not sent via WhatsApp)
    append_message(wa_id, payload.get("role"), payload.get("message"), payload.get("date"), payload.get("time"))
    return JSONResponse(content={"success": True})


@router.get("/reservations")
async def api_get_all_reservations(
    future: bool = Query(True),
    include_cancelled: bool = Query(False),
    from_date: str = Query(None),
    to_date: str = Query(None),
):
    reservations = get_all_reservations(
        future=future, include_cancelled=include_cancelled, from_date=from_date, to_date=to_date
    )
    return JSONResponse(content=reservations)


# Reservation creation endpoint
@router.post("/reserve")
async def api_reserve_time_slot(payload: dict = Body(...)):
    from app.services.domain.shared.wa_id import WaId

    # Extract and normalize wa_id from frontend payload
    raw_wa_id = payload.get("id") or payload.get("wa_id")  # Support both formats
    if not raw_wa_id:
        return JSONResponse(content={"success": False, "error": "Missing wa_id/id in payload"}, status_code=400)

    try:
        # Validate and normalize wa_id using WaId class
        wa_id = WaId.from_any_format(raw_wa_id)
        normalized_wa_id = wa_id.plain_format  # Always plain digits format
    except Exception as e:
        return JSONResponse(content={"success": False, "error": f"Invalid phone number: {str(e)}"}, status_code=400)

    # Safely resolve reservation type: 0 is valid and must not fall through
    _rtype = payload.get("type") if "type" in payload else payload.get("reservation_type")

    resp = reserve_time_slot(
        normalized_wa_id,  # Use normalized plain format
        payload.get("title") or payload.get("customer_name"),  # Support both formats
        payload.get("date") or payload.get("date_str"),  # Support both formats
        payload.get("time") or payload.get("time_slot"),  # Support both formats
        _rtype,  # 0 or 1
        hijri=payload.get("hijri", False),
        max_reservations=payload.get("max_reservations", 5),
        ar=payload.get("ar", False),
        _call_source=payload.get("_call_source", "assistant"),  # Use provided source or default to assistant
    )
    return JSONResponse(content=resp)


# Cancel reservation endpoint
@router.post("/reservations/{wa_id}/cancel")
async def api_cancel_reservation(wa_id: str, payload: dict = Body(...)):
    resp = cancel_reservation(
        wa_id,
        date_str=payload.get("date_str"),
        hijri=payload.get("hijri", False),
        ar=payload.get("ar", False),
        reservation_id_to_cancel=payload.get("reservation_id_to_cancel"),
        _call_source=payload.get("_call_source", "assistant"),  # Use provided source or default to assistant
    )
    return JSONResponse(content=resp)


# === Customers endpoints (name/age management) ===


@router.get("/phone/stats")
async def api_phone_stats():
    """
    Get phone/customer statistics efficiently.
    Returns country counts and registration status counts from all customers.
    """
    try:
        from app.services.domain.customer.phone_stats_service import PhoneStatsService

        service = PhoneStatsService()
        stats = service.get_all_stats()

        return JSONResponse(content={"success": True, "data": stats})
    except Exception as e:
        logging.error(f"Error getting phone stats: {e}")
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


@router.get("/phone/search")
async def api_phone_search(q: str = Query(..., min_length=1), limit: int = Query(100, ge=1, le=500)):
    """
    Search for phone numbers using pg_trgm. Replaces old search with database-level fuzzy matching.
    """
    try:
        from app.services.domain.customer.phone_search_service import PhoneSearchService

        service = PhoneSearchService()
        results = service.search_phones(query=q, limit=limit, min_similarity=0.3)

        return JSONResponse(content={"success": True, "data": [result.to_dict() for result in results]})
    except Exception as e:
        logging.error(f"Error searching phones: {e}")
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


@router.get("/phone/recent")
async def api_phone_recent(limit: int = Query(50, ge=1, le=100)):
    """
    Get recent contacts sorted by last user message.
    Only includes contacts that have at least one user message.
    """
    try:
        from app.services.domain.customer.phone_search_service import PhoneSearchService

        service = PhoneSearchService()
        results = service.get_recent_contacts(limit=limit)

        return JSONResponse(content={"success": True, "data": [result.to_dict() for result in results]})
    except Exception as e:
        logging.error(f"Error getting recent contacts: {e}")
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


@router.get("/phone/all")
async def api_phone_all(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    country: str | None = Query(None),
    registration: str | None = Query(None),
    date_range_type: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    exclude: str | None = Query(None),
):
    """
    Get all contacts with pagination.
    Supports filtering by country, registration status, and date range.
    Can exclude specific phone numbers (comma-separated).
    """
    try:
        from datetime import datetime

        from app.services.domain.customer.phone_search_service import PhoneSearchService

        service = PhoneSearchService()

        # Build filters dict
        filters = {}
        if country:
            filters["country"] = country
        if registration:
            filters["registration"] = registration
        if date_range_type and (date_from or date_to):
            try:
                from_date = None
                to_date = None

                if date_from:
                    from_date = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
                    # If only from_date is provided, set to start of day
                    from_date = from_date.replace(hour=0, minute=0, second=0, microsecond=0)

                if date_to:
                    to_date = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
                    # If only to_date is provided, set to end of day
                    to_date = to_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                elif from_date:
                    # If only from_date provided, treat as single day (end of same day)
                    to_date = from_date.replace(hour=23, minute=59, second=59, microsecond=999999)

                if from_date or to_date:
                    filters["date_range"] = {
                        "type": date_range_type,
                        "range": {
                            "from": from_date or to_date.replace(hour=0, minute=0, second=0, microsecond=0),
                            "to": to_date or from_date.replace(hour=23, minute=59, second=59, microsecond=999999),
                        },
                    }
            except Exception as e:
                logging.warning(f"Invalid date range: {e}")

        # Parse exclude phone numbers
        exclude_phone_numbers = None
        if exclude:
            exclude_phone_numbers = [p.strip() for p in exclude.split(",") if p.strip()]

        results, total_count = service.get_all_contacts(
            page=page,
            page_size=page_size,
            filters=filters if filters else None,
            exclude_phone_numbers=exclude_phone_numbers,
        )

        return JSONResponse(
            content={
                "success": True,
                "data": [result.to_dict() for result in results],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total_count,
                    "total_pages": (total_count + page_size - 1) // page_size if page_size > 0 else 0,
                },
            }
        )
    except Exception as e:
        logging.error(f"Error getting all contacts: {e}")
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


@router.get("/customers/{wa_id}")
async def api_get_customer(wa_id: str):
    try:
        from datetime import date

        from app.db import CustomerModel, get_session

        with get_session() as session:
            row = session.get(CustomerModel, wa_id)
            if not row:
                return JSONResponse(content={"success": True, "data": None})
            # Compute effective age using recorded date if available
            age = getattr(row, "age", None)
            recorded = getattr(row, "age_recorded_at", None)
            effective_age = None
            if age is not None:
                effective_age = age
                if recorded is not None:
                    try:
                        today = date.today()
                        years = today.year - recorded.year - ((today.month, today.day) < (recorded.month, recorded.day))
                        if years > 0:
                            effective_age = max(0, age + years)
                    except Exception:
                        effective_age = age
            # Include document JSON if present
            doc = getattr(row, "document", None)
            return JSONResponse(
                content={
                    "success": True,
                    "data": {
                        "wa_id": row.wa_id,
                        "name": getattr(row, "customer_name", None),
                        "age": effective_age,
                        "age_recorded_at": recorded.isoformat() if recorded else None,
                        "document": doc,
                    },
                }
            )
    except Exception as e:
        logging.error(f"Error fetching customer {wa_id}: {e}")
        return JSONResponse(content={"success": False, "message": "failed_to_load"}, status_code=500)


@router.put("/customers/{wa_id}")
async def api_put_customer(wa_id: str, payload: dict = Body(...)):
    import time

    start_time = time.perf_counter()
    try:
        name = payload.get("name")
        age = payload.get("age")
        document = payload.get("document")  # expected to be JSON document content

        # Fast path: document-only update (most common case for autosave)
        has_name = name is not None
        has_age = age is not None or "age" in payload
        has_document = "document" in payload

        if has_document and not has_name and not has_age:
            # Document-only save - optimized fast path
            try:
                from app.db import DATABASE_URL, CustomerModel, get_session

                # Log DB connection info once for diagnosis
                with contextlib.suppress(Exception):
                    logging.info(
                        f"🔗 DB: {DATABASE_URL.split('@')[1].split('/')[0] if '@' in DATABASE_URL else 'unknown'}"
                    )

                db_start = time.perf_counter()
                with get_session() as session:
                    # Optimized: use execute with RETURNING to avoid extra SELECT
                    from sqlalchemy import select, update

                    select_start = time.perf_counter()
                    # Check if customer exists
                    row = session.execute(select(CustomerModel.wa_id).where(CustomerModel.wa_id == wa_id)).first()
                    select_time = (time.perf_counter() - select_start) * 1000

                    update_start = time.perf_counter()
                    if row:
                        # Update existing
                        session.execute(
                            update(CustomerModel).where(CustomerModel.wa_id == wa_id).values(document=document)
                        )
                    else:
                        # Insert new
                        row = CustomerModel(wa_id=wa_id, document=document)
                        session.add(row)
                    update_time = (time.perf_counter() - update_start) * 1000

                    commit_start = time.perf_counter()
                    session.commit()
                    commit_time = (time.perf_counter() - commit_start) * 1000

                db_time = (time.perf_counter() - db_start) * 1000
                logging.info(
                    f"📊 DB breakdown: select={select_time:.1f}ms, update={update_time:.1f}ms, commit={commit_time:.1f}ms"
                )

                # Broadcast lightweight notification (no document payload)
                broadcast_start = time.perf_counter()
                try:
                    enqueue_broadcast(
                        "customer_document_updated",
                        {"wa_id": wa_id},
                        [wa_id],
                        source=payload.get("_call_source", "assistant"),
                    )
                except Exception as be:
                    logging.debug(f"Broadcast document update failed (non-fatal): {be}")
                broadcast_time = (time.perf_counter() - broadcast_start) * 1000

                total_time = (time.perf_counter() - start_time) * 1000
                logging.info(
                    f"⚡ Document save: total={total_time:.1f}ms (db={db_time:.1f}ms, broadcast={broadcast_time:.1f}ms)"
                )

                return JSONResponse(content={"success": True, "document": document})
            except Exception as e:
                logging.error(f"Error saving document for {wa_id}: {e}")
                return JSONResponse(content={"success": False, "message": "failed_to_save_document"}, status_code=500)

        # Slow path: name/age updates (uses domain service)
        service = CustomerService()
        result_name = None
        result_age = None

        # Ensure customer exists (create if missing) before applying updates
        with contextlib.suppress(Exception):
            service.get_or_create_customer(wa_id, customer_name=name)

        if has_name:
            result_name = service.update_customer_name(wa_id, name, ar=bool(payload.get("ar", False)))
            if not result_name.get("success"):
                return JSONResponse(content=result_name, status_code=400)

        if has_age:
            # allow explicit null to clear age
            result_age = service.update_customer_age(
                wa_id, age if age is not None else None, ar=bool(payload.get("ar", False))
            )
            if not result_age.get("success"):
                return JSONResponse(content=result_age, status_code=400)

        # Direct DB update for document JSON to avoid coupling domain
        if has_document:
            try:
                from app.db import CustomerModel, get_session

                with get_session() as session:
                    row = session.get(CustomerModel, wa_id)
                    if not row:
                        row = CustomerModel(wa_id=wa_id, customer_name=name or None)
                        session.add(row)
                    row.document = document
                    session.commit()
                # Broadcast lightweight notification (no document payload)
                try:
                    enqueue_broadcast("customer_document_updated", {"wa_id": wa_id}, [wa_id])
                except Exception as be:
                    logging.debug(f"Broadcast document update failed (non-fatal): {be}")
            except Exception as e:
                logging.error(f"Error saving document for {wa_id}: {e}")
                return JSONResponse(content={"success": False, "message": "failed_to_save_document"}, status_code=500)

        total_time = (time.perf_counter() - start_time) * 1000
        logging.info(f"Customer update: total={total_time:.1f}ms")

        return JSONResponse(
            content={
                "success": True,
                "name": (result_name or {}).get("data"),
                "age": (result_age or {}).get("data"),
                "document": document,
            }
        )
    except Exception as e:
        logging.error(f"Error saving customer {wa_id}: {e}")
        return JSONResponse(content={"success": False, "message": "failed_to_save"}, status_code=500)


# Modify reservation endpoint
@router.post("/reservations/{wa_id}/modify")
async def api_modify_reservation(wa_id: str, payload: dict = Body(...)):
    resp = modify_reservation(
        wa_id,
        payload.get("new_date"),
        payload.get("new_time_slot"),
        payload.get("new_name"),
        payload.get("new_type"),
        max_reservations=payload.get("max_reservations", 5),
        approximate=payload.get("approximate", False),
        hijri=payload.get("hijri", False),
        ar=payload.get("ar", False),
        reservation_id_to_modify=payload.get("reservation_id_to_modify"),
        _call_source=payload.get("_call_source", "assistant"),  # Use provided source or default to assistant
    )
    return JSONResponse(content=resp)


# Modify WhatsApp ID endpoint
@router.post("/reservations/{wa_id}/modify_id")
async def api_modify_id(wa_id: str, payload: dict = Body(...)):
    resp = modify_id(
        payload.get("old_wa_id", wa_id),
        payload.get("new_wa_id"),
        ar=payload.get("ar", False),
        customer_name=payload.get("customer_name"),
        reservation_id=payload.get("reservation_id"),
        _call_source=payload.get("_call_source", "assistant"),
    )
    return JSONResponse(content=resp)


@router.get("/message")
async def api_get_message(request: Request, key: str = Query(...), ar: bool = Query(False)):
    """
    Retrieve a translated message by key via HTTP query parameters.
    """
    # Collect any additional formatting args from query params
    params = dict(request.query_params)
    # Remove reserved params
    params.pop("key", None)
    params.pop("ar", None)
    # Convert ar to bool
    message = get_message(key, ar, **params)
    return JSONResponse(content={"message": message})


@router.get("/vacations")
async def api_get_vacation_periods():
    """
    Get vacation periods from DB.
    Returns a list of vacation periods with start and end dates.
    """
    try:
        from app.db import VacationPeriodModel, get_session

        vacation_message = config.get("VACATION_MESSAGE", "The business is closed during this period.")

        periods = []
        with get_session() as session:
            rows = session.query(VacationPeriodModel).all()
            for r in rows:
                try:
                    # start_date/end_date are DATE columns; coerce to aware datetimes for formatting
                    s_date = (
                        r.start_date
                        if isinstance(r.start_date, datetime.date)
                        else datetime.datetime.strptime(str(r.start_date), "%Y-%m-%d").date()
                    )
                    if getattr(r, "end_date", None):
                        e_date = (
                            r.end_date
                            if isinstance(r.end_date, datetime.date)
                            else datetime.datetime.strptime(str(r.end_date), "%Y-%m-%d").date()
                        )
                    else:
                        # Skip rows without end_date (legacy data should be migrated)
                        continue
                    start_dt = datetime.datetime(
                        s_date.year, s_date.month, s_date.day, tzinfo=ZoneInfo(config["TIMEZONE"])
                    )
                    end_dt = datetime.datetime(
                        e_date.year, e_date.month, e_date.day, tzinfo=ZoneInfo(config["TIMEZONE"])
                    )
                    title = (
                        str(r.title)
                        if r.title
                        else format_enhanced_vacation_message(start_dt, end_dt, vacation_message)
                    )
                    periods.append(
                        {
                            "start": start_dt.isoformat(),
                            "end": end_dt.isoformat(),
                            "title": title,
                            "duration": (e_date - s_date).days + 1,
                        }
                    )
                except Exception:
                    continue

        return JSONResponse(content=periods)

    except Exception as e:
        logging.error(f"Error getting vacation periods: {e}")
        return JSONResponse(content=[], status_code=500)


@router.post("/update-vacation-periods")
async def api_update_vacation_periods(payload: dict = Body(...)):
    """
    Update vacation periods in DB.
    Accepts structured periods only: [{ start: YYYY-MM-DD|ISO, end: YYYY-MM-DD|ISO, title?: str }].
    """
    try:
        from app.db import VacationPeriodModel, get_session

        ar = payload.get("ar", False)
        periods = payload.get("periods")

        normalized: list[tuple[datetime.date, datetime.date, str | None]] = []
        if isinstance(periods, list) and periods:
            for p in periods:
                try:
                    s_raw = p.get("start")
                    e_raw = p.get("end")
                    title = p.get("title")
                    if not s_raw or not e_raw:
                        continue
                    s_dt = (
                        datetime.datetime.fromisoformat(str(s_raw))
                        if "T" in str(s_raw)
                        else datetime.datetime.strptime(str(s_raw), "%Y-%m-%d")
                    )
                    e_dt = (
                        datetime.datetime.fromisoformat(str(e_raw))
                        if "T" in str(e_raw)
                        else datetime.datetime.strptime(str(e_raw), "%Y-%m-%d")
                    )
                    s_date = datetime.date(s_dt.year, s_dt.month, s_dt.day)
                    e_date = datetime.date(e_dt.year, e_dt.month, e_dt.day)
                    if e_date < s_date:
                        s_date, e_date = e_date, s_date
                    normalized.append((s_date, e_date, title if isinstance(title, str) else None))
                except Exception:
                    continue
        else:
            return JSONResponse(
                content={"success": False, "message": get_message("vacation_periods_update_failed", ar)},
                status_code=400,
            )

        # Upsert DB: replace all periods with new set (simple approach)
        with get_session() as session:
            session.query(VacationPeriodModel).delete(synchronize_session=False)
            for s_date, e_date, title in normalized:
                session.add(VacationPeriodModel(start_date=s_date, end_date=e_date, title=title))
            session.commit()

        # Broadcast updated vacations
        with contextlib.suppress(Exception):
            enqueue_broadcast(
                "vacation_period_updated", {"periods": []}, source=payload.get("_call_source", "assistant")
            )
        return JSONResponse(content={"success": True, "message": get_message("vacation_periods_updated", ar)})

    except Exception as e:
        logging.error(f"Error updating vacation periods: {e}")
        return JSONResponse(
            content={
                "success": False,
                "message": get_message("vacation_periods_update_failed", payload.get("ar", False)),
            },
            status_code=500,
        )


@router.post("/undo-vacation-update")
async def api_undo_vacation_update(payload: dict = Body(...)):
    """
    Undo vacation update by restoring provided structured periods into DB.
    """
    try:
        from app.db import VacationPeriodModel, get_session

        ar = payload.get("ar", False)
        original = payload.get("original_vacation_data")
        if not original:
            return JSONResponse(
                content={"success": False, "message": get_message("vacation_undo_failed", ar)}, status_code=400
            )

        periods = original.get("periods")
        if not isinstance(periods, list):
            return JSONResponse(
                content={"success": False, "message": get_message("vacation_undo_failed", ar)}, status_code=400
            )

        normalized: list[tuple[datetime.date, datetime.date, str | None]] = []
        for p in periods:
            try:
                s_raw = p.get("start")
                e_raw = p.get("end")
                title = p.get("title")
                if not s_raw or not e_raw:
                    continue
                s_dt = (
                    datetime.datetime.fromisoformat(str(s_raw))
                    if "T" in str(s_raw)
                    else datetime.datetime.strptime(str(s_raw), "%Y-%m-%d")
                )
                e_dt = (
                    datetime.datetime.fromisoformat(str(e_raw))
                    if "T" in str(e_raw)
                    else datetime.datetime.strptime(str(e_raw), "%Y-%m-%d")
                )
                s_date = datetime.date(s_dt.year, s_dt.month, s_dt.day)
                e_date = datetime.date(e_dt.year, e_dt.month, e_dt.day)
                if e_date < s_date:
                    s_date, e_date = e_date, s_date
                normalized.append((s_date, e_date, title if isinstance(title, str) else None))
            except Exception:
                continue

        with get_session() as session:
            session.query(VacationPeriodModel).delete(synchronize_session=False)
            for s_date, e_date, title in normalized:
                session.add(VacationPeriodModel(start_date=s_date, end_date=e_date, title=title))
            session.commit()

        with contextlib.suppress(Exception):
            enqueue_broadcast(
                "vacation_period_updated", {"periods": []}, source=payload.get("_call_source", "assistant")
            )
        return JSONResponse(content={"success": True, "message": get_message("vacation_update_undone", ar)})

    except Exception as e:
        logging.error(f"Error undoing vacation update: {e}")
        return JSONResponse(
            content={"success": False, "message": get_message("vacation_undo_failed", payload.get("ar", False))},
            status_code=500,
        )


# === UNDO ENDPOINTS ===


@router.post("/undo-cancel")
async def api_undo_cancel_reservation(payload: dict = Body(...)):
    """
    Undo a reservation cancellation by reinstating the reservation.
    """
    resp = undo_cancel_reservation(
        payload.get("reservation_id"), ar=payload.get("ar", False), max_reservations=payload.get("max_reservations", 5)
    )
    return JSONResponse(content=resp)


@router.get("/notifications")
async def api_get_notifications(limit: int = 2000):
    """Return the most recent notification events (default 2000)."""
    try:
        from app.db import NotificationEventModel, get_session

        limit = max(1, min(int(limit), 2000))
        with get_session() as session:
            rows = session.query(NotificationEventModel).order_by(NotificationEventModel.id.desc()).limit(limit).all()
            events = []
            for r in rows:
                try:
                    events.append(
                        {
                            "id": r.id,
                            "type": r.event_type,
                            "timestamp": r.ts_iso,
                            "data": json.loads(r.data) if isinstance(r.data, str) else r.data,
                        }
                    )
                except Exception:
                    continue
        return JSONResponse(content={"success": True, "data": events})
    except Exception as e:
        logging.error(f"Error loading notifications: {e}")
        return JSONResponse(content={"success": False, "message": "failed_to_load"}, status_code=500)
