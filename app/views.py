import logging
import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Body
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import config
from app.decorators.security import verify_signature
from app.services.llm_service import get_llm_service
from app.utils.whatsapp_utils import process_whatsapp_message as process_whatsapp_message_util, send_whatsapp_message, send_whatsapp_location, send_whatsapp_template
from app.utils.service_utils import get_all_conversations, get_all_reservations, append_message, find_nearest_time_slot
from app.services.assistant_functions import reserve_time_slot, cancel_reservation, modify_reservation, modify_id, get_available_time_slots

router = APIRouter()
security = HTTPBasic()

# Create a semaphore to limit concurrent background tasks
# Adjust the value based on memory availability (lower for less memory)
MAX_CONCURRENT_TASKS = 5
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
            raise HTTPException(status_code=403, detail="Verification failed")
    else:
        logging.info("MISSING_PARAMETER")
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
        raise HTTPException(status_code=400, detail="Invalid JSON provided")
    
    # Check for WhatsApp status update
    if body.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("statuses"):
        logging.info("Received a WhatsApp status update.")
        return JSONResponse(content={"status": "ok"})
    
    # Process message in background if it's a valid WhatsApp message
    entry = body.get("entry", [{}])[0]
    
    if "changes" in entry:
        # Try to acquire semaphore without blocking the response
        if task_semaphore.locked() and task_semaphore._value == 0:
            logging.warning("Maximum concurrent tasks reached. Message processing delayed.")
            # Still return 200 OK to WhatsApp API to prevent retries
            return JSONResponse(content={"status": "ok", "note": "Processing delayed due to high load"})
        
        await task_semaphore.acquire()
        llm_service = get_llm_service()
        
        background_tasks.add_task(
            _process_and_release,
            body,
            llm_service.run
        )
    else:
        logging.warning(f"Unknown webhook payload structure: {body}")
        
    return JSONResponse(content={"status": "ok"})

def check_auth(credentials: HTTPBasicCredentials = Depends(security)):
    """
    Validate HTTP Basic Authentication credentials.
    """
    correct_username = config["APP_ID"]
    correct_password = config["APP_SECRET"]
    if credentials.username == correct_username and credentials.password == correct_password:
        return True
    else:
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
@router.post("/reservations")
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

# Cancel reservation endpoint
@router.post("/reservations/{wa_id}/cancel")
async def api_cancel_reservation(wa_id: str, payload: dict = Body(...)):
    resp = cancel_reservation(
        wa_id,
        date_str=payload.get("date_str"),
        hijri=payload.get("hijri", False),
        ar=payload.get("ar", False)
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
        ar=payload.get("ar", False)
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

# Nearest time slot endpoint for front-end approximation
@router.post("/reservations/nearest")
async def api_find_nearest_time_slot(payload: dict = Body(...)):
    """Returns the nearest available time slot for a given date and target slot."""
    date_str = payload.get("date_str")
    time_slot = payload.get("time_slot")
    max_reservations = payload.get("max_reservations", 5)
    hijri = payload.get("hijri", False)
    ar = payload.get("ar", False)
    # Retrieve available slots
    resp_slots = get_available_time_slots(date_str, max_reservations, hijri=hijri)
    if not resp_slots.get("success", False):
        return JSONResponse(content=resp_slots)
    available_slots = resp_slots.get("data", [])
    # Find nearest slot
    nearest = find_nearest_time_slot(time_slot, available_slots)
    if not nearest:
        # No approximation found
        from app.i18n import get_message
        msg = get_message("system_error_try_later", ar=ar)
        return JSONResponse(content={"success": False, "message": msg})
    return JSONResponse(content={"success": True, "time_slot": nearest})

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
    from app.i18n import get_message
    message = get_message(key, ar, **params)
    return JSONResponse(content={"message": message})