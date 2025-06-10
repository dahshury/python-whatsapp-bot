import logging
import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Body
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import config
from app.decorators.security import verify_signature
from app.services.llm_service import get_llm_service
from app.utils.whatsapp_utils import is_valid_whatsapp_message, process_whatsapp_message as process_whatsapp_message_util, send_whatsapp_message, send_whatsapp_location, send_whatsapp_template
from app.utils.service_utils import get_all_conversations, get_all_reservations, append_message, format_enhanced_vacation_message
from app.services.assistant_functions import reserve_time_slot, cancel_reservation, modify_reservation, modify_id, undo_cancel_reservation, undo_reserve_time_slot
from app.metrics import INVALID_HTTP_REQUESTS, CONCURRENT_TASK_LIMIT_REACHED, WHATSAPP_MESSAGE_FAILURES
import datetime
from zoneinfo import ZoneInfo
from app.i18n import get_message

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
    hub_challenge: str = Query(None, alias="hub.challenge")
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
            INVALID_HTTP_REQUESTS.inc()  # Track invalid verification
            raise HTTPException(status_code=403, detail="Verification failed")
    else:
        logging.info("MISSING_PARAMETER")
        INVALID_HTTP_REQUESTS.inc()  # Track missing parameters
        raise HTTPException(status_code=400, detail="Missing parameters")

async def _process_and_release(body, run_llm_function):
    """Process a WhatsApp message and release the semaphore when done."""
    try:
        await process_whatsapp_message_util(body, run_llm_function)
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
async def webhook_post(
    request: Request,
    background_tasks: BackgroundTasks,
    _=Depends(verify_signature)
):
    """
    Process incoming webhook events from WhatsApp API.
    """
    try:
        body = await request.json()
        logging.info(f"Request body: {body}")
    except Exception:
        logging.error("Failed to decode JSON")
        INVALID_HTTP_REQUESTS.inc()  # Track invalid JSON
        raise HTTPException(status_code=400, detail="Invalid JSON provided")
    
    # Check for WhatsApp status update
    if body.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("statuses"):
        logging.info("Received a WhatsApp status update.")
        
        # Check for failed message delivery status
        statuses = body.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("statuses", [])
        for status in statuses:
            if status.get("status") == "failed":
                logging.warning(f"WhatsApp message delivery failed: {status}")
                WHATSAPP_MESSAGE_FAILURES.inc()  # Track message delivery failures
                
        return JSONResponse(content={"status": "ok"})
    
    # Process message in background if it's a valid WhatsApp message
    if is_valid_whatsapp_message(body):
        # Try to acquire semaphore without blocking the response
        if task_semaphore.locked() and task_semaphore._value == 0:
            # Log current semaphore status
            logging.warning(f"Maximum concurrent tasks reached ({MAX_CONCURRENT_TASKS}). Message processing delayed.")
            CONCURRENT_TASK_LIMIT_REACHED.inc()  # Track concurrent task limit reached
            # Still return 200 OK to WhatsApp API to prevent retries
            return JSONResponse(content={"status": "ok", "note": "Processing delayed due to high load"})
        
        # Log task creation
        try:
            await task_semaphore.acquire()
            llm_service = get_llm_service()
            logging.debug(f"Semaphore acquired. Tasks in progress: {MAX_CONCURRENT_TASKS - task_semaphore._value}")
            
            background_tasks.add_task(
                _process_and_release,
                body,
                llm_service.run
            )
        except Exception as e:
            # Make sure to release the semaphore if task creation fails
            if task_semaphore.locked():
                task_semaphore.release()
            logging.error(f"Failed to create background task: {e}")
            
        return JSONResponse(content={"status": "ok"})
    else:
        logging.warning(f"Unknown webhook payload structure: {body}")
        INVALID_HTTP_REQUESTS.inc()  # Track unknown webhook payload
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
        INVALID_HTTP_REQUESTS.inc()  # Track unauthorized access
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
    response = await send_whatsapp_message(wa_id, text)
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
    if hasattr(response, 'json'):
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

@router.get("/conversations")
async def api_get_all_conversations(recent: str = Query(None), limit: int = Query(0)):
    conversations = get_all_conversations(recent=recent, limit=limit)
    return JSONResponse(content=conversations)

@router.post("/conversations/{wa_id}")
async def api_append_message(wa_id: str, payload: dict = Body(...)):
    append_message(
        wa_id,
        payload.get("role"),
        payload.get("message"),
        payload.get("date"),
        payload.get("time")
    )
    return JSONResponse(content={"success": True})

@router.get("/reservations")
async def api_get_all_reservations(future: bool = Query(True), include_cancelled: bool = Query(False)):
    reservations = get_all_reservations(future=future, include_cancelled=include_cancelled)
    return JSONResponse(content=reservations)

# Reservation creation endpoint
@router.post("/reserve")
async def api_reserve_time_slot(payload: dict = Body(...)):
    resp = reserve_time_slot(
        payload.get("wa_id"),
        payload.get("customer_name"),
        payload.get("date_str"),
        payload.get("time_slot"),
        payload.get("reservation_type"),
        hijri=payload.get("hijri", False),
        max_reservations=payload.get("max_reservations", 5),
        ar=payload.get("ar", False)
    )
    return JSONResponse(content=resp)

# Reservation creation endpoint (legacy endpoint for backward compatibility)
@router.post("/reservations")
async def api_reserve_time_slot_legacy(payload: dict = Body(...)):
    return await api_reserve_time_slot(payload)

# Cancel reservation endpoint
@router.post("/reservations/{wa_id}/cancel")
async def api_cancel_reservation(wa_id: str, payload: dict = Body(...)):
    resp = cancel_reservation(
        wa_id,
        date_str=payload.get("date_str"),
        hijri=payload.get("hijri", False),
        ar=payload.get("ar", False),
        reservation_id_to_cancel=payload.get("reservation_id_to_cancel")
    )
    return JSONResponse(content=resp)

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
        reservation_id_to_modify=payload.get("reservation_id_to_modify")
    )
    return JSONResponse(content=resp)

# Modify WhatsApp ID endpoint
@router.post("/reservations/{wa_id}/modify_id")
async def api_modify_id(wa_id: str, payload: dict = Body(...)):
    resp = modify_id(
        payload.get("old_wa_id", wa_id),
        payload.get("new_wa_id"),
        ar=payload.get("ar", False)
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
    Get vacation periods from configuration.
    Returns a list of vacation periods with start and end dates.
    """
    try:
        vacation_periods = []
        
        # Get vacation configuration
        vacation_start_dates = config.get("VACATION_START_DATES", "")
        vacation_durations = config.get("VACATION_DURATIONS", "")
        vacation_message = config.get("VACATION_MESSAGE", "The business is closed during this period.")
        
        # Process vacation periods if configured
        if vacation_start_dates and vacation_durations and isinstance(vacation_start_dates, str) and isinstance(vacation_durations, str):
            try:
                start_dates = [d.strip() for d in vacation_start_dates.split(',') if d.strip()]
                durations = [int(d.strip()) for d in vacation_durations.split(',') if d.strip()]
                
                if len(start_dates) == len(durations):
                    for start_date_str, duration in zip(start_dates, durations):
                        try:
                            # Parse start date
                            start_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").replace(tzinfo=ZoneInfo(config['TIMEZONE']))
                            # Fix: Treat duration as inclusive days count
                            # For 20 days starting May 31: May 31 + 19 days = June 19 (20th day inclusive)
                            end_date = start_date + datetime.timedelta(days=duration-1)
                            
                            # Create comprehensive vacation message using the utility function
                            enhanced_vacation_message = format_enhanced_vacation_message(start_date, end_date, vacation_message)
                            
                            vacation_periods.append({
                                "start": start_date.isoformat(),
                                "end": end_date.isoformat(),
                                "title": enhanced_vacation_message,
                                "duration": duration
                            })
                        except ValueError as e:
                            logging.error(f"Error parsing vacation date {start_date_str}: {e}")
                            continue
                            
            except (ValueError, TypeError) as e:
                logging.error(f"Error parsing vacation configuration: {e}")
        
        return JSONResponse(content=vacation_periods)
        
    except Exception as e:
        logging.error(f"Error getting vacation periods: {e}")
        return JSONResponse(content=[], status_code=500)

@router.post("/update-vacation-periods")
async def api_update_vacation_periods(payload: dict = Body(...)):
    """
    Update vacation periods configuration.
    """
    try:
        start_dates = payload.get("start_dates", "")
        durations = payload.get("durations", "")
        ar = payload.get("ar", False)
        
        # Update the configuration
        config["VACATION_START_DATES"] = start_dates
        config["VACATION_DURATIONS"] = durations
        
        # Save to environment file if using .env
        import os
        from dotenv import set_key
        
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        
        if os.path.exists(env_path):
            set_key(env_path, 'VACATION_START_DATES', start_dates)
            set_key(env_path, 'VACATION_DURATIONS', durations)
        
        logging.info(f"Updated vacation periods: start_dates={start_dates}, durations={durations}")
        
        return JSONResponse(content={
            "success": True,
            "message": get_message("vacation_periods_updated", ar)
        })
        
    except Exception as e:
        logging.error(f"Error updating vacation periods: {e}")
        return JSONResponse(content={
            "success": False,
            "message": get_message("vacation_periods_update_failed", ar)
        }, status_code=500)

@router.post("/undo-vacation-update")
async def api_undo_vacation_update(payload: dict = Body(...)):
    """
    Undo a vacation period update by reverting to original vacation data.
    """
    try:
        original_vacation_data = payload.get("original_vacation_data")
        ar = payload.get("ar", False)
        
        if not original_vacation_data:
            return JSONResponse(content={
                "success": False,
                "message": get_message("vacation_undo_failed", ar)
            }, status_code=400)
        
        # Restore the original vacation periods
        original_start_dates = original_vacation_data.get("start_dates", "")
        original_durations = original_vacation_data.get("durations", "")
        
        # Update the configuration
        config["VACATION_START_DATES"] = original_start_dates
        config["VACATION_DURATIONS"] = original_durations
        
        # Save to environment file if using .env
        import os
        from dotenv import set_key
        
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        
        if os.path.exists(env_path):
            set_key(env_path, 'VACATION_START_DATES', original_start_dates)
            set_key(env_path, 'VACATION_DURATIONS', original_durations)
        
        logging.info(f"Undone vacation update: restored to start_dates={original_start_dates}, durations={original_durations}")
        
        return JSONResponse(content={
            "success": True,
            "message": get_message("vacation_update_undone", ar)
        })
        
    except Exception as e:
        logging.error(f"Error undoing vacation update: {e}")
        return JSONResponse(content={
            "success": False,
            "message": get_message("vacation_undo_failed", ar)
        }, status_code=500)

# === UNDO ENDPOINTS ===

@router.post("/undo-reserve")
async def api_undo_reserve_time_slot(payload: dict = Body(...)):
    """
    Undo a reservation creation by cancelling the reservation.
    """
    resp = undo_reserve_time_slot(
        payload.get("reservation_id"),
        ar=payload.get("ar", False)
    )
    return JSONResponse(content=resp)

@router.post("/undo-cancel")
async def api_undo_cancel_reservation(payload: dict = Body(...)):
    """
    Undo a reservation cancellation by reinstating the reservation.
    """
    resp = undo_cancel_reservation(
        payload.get("reservation_id"),
        ar=payload.get("ar", False)
    )
    return JSONResponse(content=resp)

@router.post("/undo-modify")
async def api_undo_modify_reservation(payload: dict = Body(...)):
    """
    Undo a reservation modification by reverting to original data.
    """
    resp = modify_reservation(
        payload.get("wa_id"),
        payload.get("new_date"),
        payload.get("new_time_slot"),
        payload.get("new_name"),
        payload.get("new_type"),
        max_reservations=payload.get("max_reservations", 5),
        approximate=payload.get("approximate", False),
        hijri=payload.get("hijri", False),
        ar=payload.get("ar", False),
        reservation_id_to_modify=payload.get("reservation_id_to_modify")
    )
    return JSONResponse(content=resp)