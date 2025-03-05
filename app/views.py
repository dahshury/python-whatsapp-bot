import json
from app.db import get_connection
import os
import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from app.config import config
from app.decorators.security import verify_signature
from app.services.openai_service import process_whatsapp_message

router = APIRouter()
security = HTTPBasic()

@router.get("/webhook")
async def webhook_get(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
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

@router.post("/webhook")
async def webhook_post(
    request: Request,
    background_tasks: BackgroundTasks,
    _=Depends(verify_signature)
):
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
    
    # Schedule the asynchronous process_whatsapp_message directly as a background task.
    background_tasks.add_task(process_whatsapp_message, body)
    return JSONResponse(content={"status": "ok"})

def check_auth(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = config["APP_ID"]
    correct_password = config["APP_SECRET"]
    if credentials.username == correct_username and credentials.password == correct_password:
        return True
    else:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.get("/download/")
async def download_json(credentials: HTTPBasicCredentials = Depends(security)):
    check_auth(credentials)
    conn = get_connection()
    cursor = conn.cursor()
    # Fetch all thread records
    cursor.execute("SELECT wa_id, thread_id FROM threads")
    threads = cursor.fetchall()
    data = {}
    for thread in threads:
        wa_id = thread["wa_id"]
        data[wa_id] = {"thread_id": thread["thread_id"]}
        # Fetch conversation messages for the current wa_id
        cursor.execute("SELECT role, message, date, time FROM conversation WHERE wa_id = ? ORDER BY id", (wa_id,))
        conversation = [dict(row) for row in cursor.fetchall()]
        data[wa_id]["conversation"] = conversation
        # Fetch reservations for the current wa_id
        cursor.execute("SELECT date, time_slot FROM reservations WHERE wa_id = ?", (wa_id,))
        reservations = [dict(row) for row in cursor.fetchall()]
        data[wa_id]["reservations"] = reservations
    conn.close()
    
    json_data = json.dumps(data, indent=4, ensure_ascii=False)
    temp_json_filename = os.path.join(os.getcwd(), "threads_db.json")
    with open(temp_json_filename, "w", encoding="utf-8") as f:
        f.write(json_data)
    return FileResponse(
        temp_json_filename,
        filename="threads_db.json",
        media_type="application/json"
    )