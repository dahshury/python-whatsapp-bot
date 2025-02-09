import logging
from flask import current_app, jsonify
import json
import requests

from app.services.openai_service import generate_response
import re


def log_http_response(response):
    logging.info(f"Status: {response.status_code}")
    logging.info(f"Content-type: {response.headers.get('content-type')}")
    logging.info(f"Body: {response.text}")


def get_text_message_input(recipient, text):
    return json.dumps(
        {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
    )

def send_message(data):
    """
    Sends a message using the WhatsApp API.
    This function sends a message to a specified phone number using the WhatsApp API provided by Facebook. 
    It constructs the necessary headers and URL, and handles potential exceptions that may occur during the request.
    Args:
        data (dict): The message payload to be sent in JSON format.
    Returns:
        Response: If the request is successful, returns the response object from the requests library.
        tuple: If an error occurs, returns a tuple containing a JSON response and an HTTP status code.
            - On timeout, returns ({"status": "error", "message": "Request timed out"}, 408).
            - On other request exceptions, returns ({"status": "error", "message": "Failed to send message"}, 500).
    Raises:
        requests.HTTPError: If the HTTP request returned an unsuccessful status code.
    """
    
    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {current_app.config['ACCESS_TOKEN']}",
    }

    url = f"https://graph.facebook.com/{current_app.config['VERSION']}/{current_app.config['PHONE_NUMBER_ID']}/messages"

    try:
        response = requests.post(
            url, data=data, headers=headers, timeout=10
        )  # 10 seconds timeout as an example
        response.raise_for_status()  # Raises an HTTPError if the HTTP request returned an unsuccessful status code
    except requests.Timeout:
        logging.error("Timeout occurred while sending message")
        return jsonify({"status": "error", "message": "Request timed out"}), 408
    except (
        requests.RequestException
    ) as e:  # This will catch any general request exception
        logging.error(f"Request failed due to: {e}")
        return jsonify({"status": "error", "message": "Failed to send message"}), 500
    else:
        # Process the response as normal
        log_http_response(response)
        return response


def process_text_for_whatsapp(text):
    # Remove brackets
    pattern = r"\【.*?\】"
    # Substitute the pattern with an empty string
    text = re.sub(pattern, "", text).strip()

    # Pattern to find double asterisks including the word(s) in between
    pattern = r"\*\*(.*?)\*\*"

    # Replacement pattern with single asterisks
    replacement = r"*\1*"

    # Substitute occurrences of the pattern with the replacement
    whatsapp_style_text = re.sub(pattern, replacement, text)

    return whatsapp_style_text


def process_whatsapp_message(body):
    response = None
    wa_id = body["entry"][0]["changes"][0]["value"]["contacts"][0]["wa_id"]
    name = body["entry"][0]["changes"][0]["value"]["contacts"][0]["profile"]["name"]
    message = body["entry"][0]["changes"][0]["value"]["messages"][0]
    # timestamp = body["entry"][0]["changes"][0]["value"]["messages"][0]
    try:
        message_body = message["text"]["body"]
    except Exception as e:
        logging.info(f"Incoming message contains: {message}, Can't process user's message type.")
        message_body = None
        
    # OpenAI Integration
    if message_body:
        response = generate_response(message_body, wa_id, name)
        response = process_text_for_whatsapp(response)
    elif message['type'] in ['audio', 'image']:
        response = process_text_for_whatsapp("عفوًا، لا يمكنني معالجة ملفات إلا النصوص فقط. للاستفسارات، يرجى التواصل على السكرتيرة هاتفيًا على الرقم 0591066596 في أوقات الدوام الرسمية.")
    
    if response:
        data = get_text_message_input(wa_id, response)
        send_message(data)


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
