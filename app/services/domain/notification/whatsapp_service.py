from typing import Any

from app.config import config
from app.i18n import get_message
from app.metrics import WHATSAPP_MESSAGE_FAILURES
from app.utils import format_response
from app.utils.http_client import sync_client

from ..shared.base_service import BaseService


class WhatsAppService(BaseService):
    """
    Service responsible for WhatsApp communication operations.
    Handles sending location and other WhatsApp messages.
    """

    def get_service_name(self) -> str:
        return "WhatsAppService"

    def send_business_location(self, wa_id: str) -> dict[str, Any]:
        """
        Send business location to WhatsApp user.

        Args:
            wa_id: WhatsApp ID to send location to

        Returns:
            Success/failure response with appropriate message
        """
        try:
            # Validate WhatsApp ID
            validation_error = self._validate_wa_id(wa_id)
            if validation_error:
                return validation_error

            # Build WhatsApp API payload
            payload = self._build_location_payload(wa_id)
            headers = self._build_headers()
            url = self._build_api_url()

            # Send location message
            response = sync_client.post(url, json=payload, headers=headers)
            response.raise_for_status()

            return format_response(True, message=get_message("location_sent"))

        except Exception as e:
            WHATSAPP_MESSAGE_FAILURES.inc()
            return self._handle_error("send_business_location", e)

    def _build_location_payload(self, wa_id: str) -> dict[str, Any]:
        """
        Build WhatsApp location message payload.

        Args:
            wa_id: WhatsApp ID to send to

        Returns:
            WhatsApp API payload dictionary
        """
        return {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": wa_id,
            "type": "location",
            "location": {
                "latitude": config["BUSINESS_LATITUDE"],
                "longitude": config["BUSINESS_LONGITUDE"],
                "name": config["BUSINESS_NAME"],
                "address": config["BUSINESS_ADDRESS"],
            },
        }

    def _build_headers(self) -> dict[str, str]:
        """
        Build WhatsApp API headers.

        Returns:
            Headers dictionary for WhatsApp API
        """
        return {"Content-Type": "application/json", "Authorization": f"Bearer {config['ACCESS_TOKEN']}"}

    def _build_api_url(self) -> str:
        """
        Build WhatsApp API URL.

        Returns:
            Complete WhatsApp API URL
        """
        return f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"
