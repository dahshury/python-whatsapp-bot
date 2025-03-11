import logging
import json
import re
import requests
from app.config import config

def log_http_response(response):
    logging.info(f"Status: {response.status_code}")
    logging.info(f"Content-type: {response.headers.get('content-type')}")
    logging.info(f"Body: {response.text}")
    
def send_whatsapp_message(wa_id, text):
    """
    Sends a text message using the WhatsApp API.
    Args:
        recipient (str): The recipient's WhatsApp ID.
        text (str): The text message to be sent.
    Returns:
        Response: If the request is successful, returns the response object from the requests library.
        tuple: If an error occurs, returns a tuple containing a JSON response and an HTTP status code.
            - On timeout, returns ({"status": "error", "message": "Request timed out"}, 408).
            - On other request exceptions, returns ({"status": "error", "message": "Failed to send message"}, 500).
    Raises:
        requests.HTTPError: If the HTTP request returned an unsuccessful status code.
    """
    data = json.dumps({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": wa_id,
        "type": "text",
        "text": {"preview_url": False, "body": text},
    })
    
    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
    }
    url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"
    try:
        response = requests.post(url, data=data, headers=headers, timeout=10)
        response.raise_for_status()
        
    except requests.Timeout:
        logging.error("Timeout occurred while sending message")
        return {"status": "error", "message": "Request timed out"}, 408
    except requests.RequestException as e:
        logging.error(f"Request failed: {e}")
        return {"status": "error", "message": "Failed to send message"}, 500
    else:
        log_http_response(response)
        return response
    
def create_appointment_template():
    """Create a WhatsApp message template for appointment reminders."""
    url = f"https://graph.facebook.com/v21.0/{config['PHONE_NUMBER_ID']}/message_templates"
    
    headers = {
        "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
        "Content-Type": "application/json"
    }
    
    data = {
        "name": "appointment_reminder",
        "language": "ar",
        "category": "APPOINTMENT",
        "components": [
            {
                "type": "BODY",
                "text": "نذكركم بأن لديكم حجز غدًا في {{1}}.\nنرجو التكرم بالحضور في موعد الحجز المحدد.\nيفضل الحضور قبل موعد الحجز ب 10 دقائق.\nالدخول في الفترة الزمنية المحددة بالأعلى يكون بأسبقية الحضور.",
                "example": {
                    "body_text": [
                        ["3:00 PM"]
                    ]
                }
            }
        ]
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

def send_whatsapp_location(wa_id, latitude, longitude, name="", address=""):
    """
    Sends a location message using the WhatsApp API.
    
    Args:
        wa_id (str): The recipient's WhatsApp ID.
        latitude (float): The latitude of the location.
        longitude (float): The longitude of the location.
        name (str, optional): The name of the location or business.
        address (str, optional): The address of the location or business.
    
    Returns:
        dict: A dictionary indicating the status and a message.
              - On success: {"status": "success", "message": "Location sent successfully"}
              - On timeout: ({"status": "error", "message": "Request timed out"}, 408)
              - On request exception: ({"status": "error", "message": "Failed to send location message"}, 500)
    
    Raises:
        requests.HTTPError: If the HTTP request returns an unsuccessful status code.
    """
    data = json.dumps({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": wa_id,
        "type": "location",
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "name": name,
            "address": address
        }
    })

    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
    }
    url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"

    try:
        response = requests.post(url, data=data, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.Timeout:
        logging.error("Timeout occurred while sending location message")
        return {"status": "error", "message": "Request timed out"}, 408
    except requests.RequestException as e:
        logging.error(f"Request failed: {e}")
        return {"status": "error", "message": "Failed to send location message"}, 500
    else:
        log_http_response(response)
        return {"status": "success", "message": "Location sent successfully"}

def process_text_for_whatsapp(text):
    pattern = r"\【.*?\】"
    text = re.sub(pattern, "", text).strip()
    pattern = r"\*\*(.*?)\*\*"
    replacement = r"*\1*"
    whatsapp_style_text = re.sub(pattern, replacement, text)
    return whatsapp_style_text

def is_valid_whatsapp_message(body):
    """
    Check if the incoming webhook event has a valid WhatsApp message structure.
    """
    return (
        body.get("object")
        and body.get("entry")
        and body["entry"][0].get("changes")
        and body["entry"][0]["changes"][0].get("value")
        and body["entry"][0]["changes"][0]["value"].get("messages")
        and body["entry"][0]["changes"][0]["value"]["messages"][0]
    )
