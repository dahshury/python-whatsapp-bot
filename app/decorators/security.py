import logging
import hashlib
import hmac
from fastapi import Request, HTTPException
from app.config import config

def validate_signature(payload: str, signature: str) -> bool:
    """
    Validate the incoming payload's signature against our expected signature.
    """
    expected_signature = hmac.new(
        bytes(config["APP_SECRET"], "latin-1"),
        msg=payload.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)

async def verify_signature(request: Request):
    """
    Dependency for FastAPI to ensure that incoming requests are signed correctly.
    """
    signature_header = request.headers.get("X-Hub-Signature-256", "")
    if not signature_header.startswith("sha256="):
        logging.info("Signature missing or improperly formatted")
        raise HTTPException(status_code=403, detail="Invalid signature")
    signature = signature_header[7:]  # Remove 'sha256='
    body = await request.body()
    payload = body.decode("utf-8")
    if not validate_signature(payload, signature):
        logging.info("Signature verification failed!")
        raise HTTPException(status_code=403, detail="Invalid signature")
