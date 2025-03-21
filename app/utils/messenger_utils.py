import json
import logging
import requests
from app.config import config
from app.utils.logging_utils import log_http_response

def send_messenger_message(recipient_id, text):
    """
    Sends a text message using the Facebook Messenger API.
    
    Args:
        recipient_id (str): The recipient's Facebook ID.
        text (str): The text message to be sent.
    
    Returns:
        Response: If the request is successful, returns the response object.
        tuple: If an error occurs, returns a tuple with error details.
    """
    data = json.dumps({
        "recipient": {"id": recipient_id},
        "message": {"text": text}
    })
    
    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {config['PAGE_ACCESS_TOKEN']}",
    }
    url = f"https://graph.facebook.com/{config['VERSION']}/me/messages"
    
    try:
        response = requests.post(url, data=data, headers=headers, timeout=10)
        response.raise_for_status()
        
    except requests.Timeout:
        logging.error("Timeout occurred while sending Messenger message")
        return {"status": "error", "message": "Request timed out"}, 408
    except requests.RequestException as e:
        logging.error(f"Messenger request failed: {e}")
        return {"status": "error", "message": "Failed to send Messenger message"}, 500
    else:
        log_http_response(response)
        return response