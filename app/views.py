import logging
import json
import shelve
from flask import Blueprint, request, jsonify, current_app, send_file, Response
from .decorators.security import signature_required
from .utils.whatsapp_utils import (
    process_whatsapp_message,
    is_valid_whatsapp_message,
)
from dotenv import load_dotenv
import os

load_dotenv()
username = os.getenv("APP_ID")
password = os.getenv("APP_SECRET")

webhook_blueprint = Blueprint("webhook", __name__)


def handle_message():
    """
    Handle incoming webhook events from the WhatsApp API.

    This function processes incoming WhatsApp messages and other events,
    such as delivery statuses. If the event is a valid message, it gets
    processed. If the incoming payload is not a recognized WhatsApp event,
    an error is returned.

    Every message send will trigger 4 HTTP requests to your webhook: message, sent, delivered, read.

    Returns:
        response: A tuple containing a JSON response and an HTTP status code.
    """
    body = request.get_json()
    logging.info(f"request body: {body}")

    # Check if it's a WhatsApp status update
    if (
        body.get("entry", [{}])[0]
        .get("changes", [{}])[0]
        .get("value", {})
        .get("statuses")
    ):
        logging.info("Received a WhatsApp status update.")
        return jsonify({"status": "ok"}), 200

    try:
        if is_valid_whatsapp_message(body):
            process_whatsapp_message(body)
            return jsonify({"status": "ok"}), 200
        else:
            # if the request is not a WhatsApp API event, return an error
            return (
                jsonify({"status": "error", "message": "Not a WhatsApp API event"}),
                404,
            )
    except json.JSONDecodeError:
        logging.error("Failed to decode JSON")
        return jsonify({"status": "error", "message": "Invalid JSON provided"}), 400


# Required webhook verifictaion for WhatsApp
def verify():
    # Parse params from the webhook verification request
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")
    # Check if a token and mode were sent
    if mode and token:
        # Check the mode and token sent are correct
        if mode == "subscribe" and token == current_app.config["VERIFY_TOKEN"]:
            # Respond with 200 OK and challenge token from the request
            logging.info("WEBHOOK_VERIFIED")
            return challenge, 200
        else:
            # Responds with '403 Forbidden' if verify tokens do not match
            logging.info("VERIFICATION_FAILED")
            return jsonify({"status": "error", "message": "Verification failed"}), 403
    else:
        # Responds with '400 Bad Request' if verify tokens do not match
        logging.info("MISSING_PARAMETER")
        return jsonify({"status": "error", "message": "Missing parameters"}), 400


@webhook_blueprint.route("/webhook", methods=["GET"])
def webhook_get():
    return verify()

@webhook_blueprint.route("/webhook", methods=["POST"])
@signature_required
def webhook_post():
    return handle_message()

# Define the credentials you want to require
AUTH_USERNAME = "admin"      # Replace with your desired username
AUTH_PASSWORD = "secretpass" # Replace with your desired password

def check_auth(username, password):
    """
    Check if a username/password combination is valid.
    """
    return username == AUTH_USERNAME and password == AUTH_PASSWORD

def authenticate():
    """
    Sends a 401 response that enables basic auth.
    """
    return Response(
        'Could not verify your access level for that URL.\n'
        'You have to login with proper credentials', 401,
        {'WWW-Authenticate': 'Basic realm="Login Required"'})

@webhook_blueprint.route('/download/', methods=['GET'])
def download_json():
    # Check for valid basic authentication credentials.
    auth = request.authorization
    if not auth or not check_auth(auth.username, auth.password):
        return authenticate()

    # Open the shelve database in read-only mode.
    with shelve.open("threads_db", flag="r") as db:
        # Convert the shelve data to a standard dictionary.
        data = dict(db)

    # Serialize the data to JSON with indentation for readability.
    json_data = json.dumps(data, indent=4, ensure_ascii=False)

    # Define a temporary filename (stored relative to the app's root).
    temp_json_filename = os.path.join(current_app.root_path, "threads_db.json")

    # Write the JSON string to the file.
    with open(temp_json_filename, "w") as f:
        f.write(json_data)

    # Use Flask's send_file to serve the JSON file as an attachment.
    return send_file(temp_json_filename, as_attachment=True)