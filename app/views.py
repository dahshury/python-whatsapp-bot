import json
from app.db import get_connection
import os
import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from app.config import config
from app.decorators.security import verify_signature
from app.services.anthropic_service import process_whatsapp_message, process_messenger_message

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
    
    # Identify message type based on payload structure
    entry = body.get("entry", [{}])[0]
    
    # Check if it's a Messenger message
    if "messaging" in entry:
        logging.info("Processing Facebook Messenger message")
        background_tasks.add_task(process_messenger_message, body)
    # Otherwise assume it's a WhatsApp message (has "changes")
    elif "changes" in entry:
        logging.info("Processing WhatsApp message")
        background_tasks.add_task(process_whatsapp_message, body)
    else:
        logging.warning(f"Unknown webhook payload structure: {body}")
        
    return JSONResponse(content={"status": "ok"})

def check_auth(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = config["APP_ID"]
    correct_password = config["APP_SECRET"]
    if credentials.username == correct_username and credentials.password == correct_password:
        return True
    else:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.get("/app")
async def redirect_to_app(request: Request):
    query_params = request.query_params
    redirect_url = config["APP_URL"]
    if query_params:
        redirect_url = f"{redirect_url}?{query_params}"
    return RedirectResponse(url=redirect_url)