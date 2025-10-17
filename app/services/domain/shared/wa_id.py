"""
WhatsApp ID validation and formatting
"""

import re

import phonenumbers
from phonenumbers import NumberParseException, PhoneNumberFormat
from pydantic import BaseModel, field_validator
from pydantic_core import PydanticCustomError


class WaId(BaseModel):
    """
    WhatsApp ID wrapper that ensures valid international phone number format
    Stores numbers in plain international dialing format (digits only)
    """

    value: str

    @field_validator("value")
    @classmethod
    def validate_wa_id(cls, v: str) -> str:
        """
        Validate and normalize WhatsApp ID to plain international format

        Args:
            v: Phone number in various formats (e.g., +966501234567, 966501234567, etc.)

        Returns:
            Normalized phone number in plain international format (e.g., 966501234567)

        Raises:
            PydanticCustomError: If phone number is invalid
        """
        if not v or not isinstance(v, str):
            raise PydanticCustomError(
                "wa_id_invalid", "WhatsApp ID cannot be empty", {"input": v}
            )

        # Clean the input - remove any non-digit characters except +
        cleaned = re.sub(r"[^\d+]", "", v.strip())

        if not cleaned:
            raise PydanticCustomError(
                "wa_id_invalid", "WhatsApp ID must contain digits", {"input": v}
            )

        try:
            # Try to parse with phonenumbers library
            # Add + if it doesn't start with one for parsing
            parse_input = cleaned if cleaned.startswith("+") else f"+{cleaned}"

            # Parse the phone number (None = international format)
            phone_number = phonenumbers.parse(parse_input, None)

            # Validate it's a valid number
            if not phonenumbers.is_valid_number(phone_number):
                raise PydanticCustomError(
                    "wa_id_invalid", "Invalid phone number format", {"input": v}
                )

            # Format to E164 and remove the + prefix for storage
            e164_format = phonenumbers.format_number(
                phone_number, PhoneNumberFormat.E164
            )
            return e164_format[1:]  # Remove + prefix, store as plain digits

        except NumberParseException as e:
            raise PydanticCustomError(
                "wa_id_invalid",
                f"Unable to parse phone number: {e.error_type.name}",
                {"input": v},
            ) from e
        except Exception as e:
            raise PydanticCustomError(
                "wa_id_invalid",
                f"Phone number validation failed: {str(e)}",
                {"input": v},
            ) from e

    def __str__(self) -> str:
        return self.value

    def __repr__(self) -> str:
        return f"WaId({self.value!r})"

    @property
    def display_format(self) -> str:
        """
        Get the display format with + prefix for UI purposes

        Returns:
            Phone number with + prefix (e.g., +966501234567)
        """
        return f"+{self.value}"

    @property
    def plain_format(self) -> str:
        """
        Get the plain format without + prefix for database/API storage

        Returns:
            Phone number without + prefix (e.g., 966501234567)
        """
        return self.value

    @classmethod
    def from_any_format(cls, phone_input: str) -> "WaId":
        """
        Create WaId from any phone number format

        Args:
            phone_input: Phone number in any format

        Returns:
            WaId instance with normalized value
        """
        return cls(value=phone_input)

    def is_saudi_number(self) -> bool:
        """
        Check if this is a Saudi Arabian phone number

        Returns:
            True if the number is Saudi (starts with 966)
        """
        return self.value.startswith("966")

    def get_country_code(self) -> str | None:
        """
        Get the country code for this phone number

        Returns:
            ISO country code (e.g., 'SA' for Saudi Arabia) or None if unknown
        """
        try:
            phone_number = phonenumbers.parse(f"+{self.value}", None)
            return phonenumbers.region_code_for_number(phone_number)
        except (NumberParseException, Exception):
            return None


# Convenience functions for common operations
def normalize_wa_id(phone_input: str) -> str:
    """
    Normalize a phone number to plain international format

    Args:
        phone_input: Phone number in any format

    Returns:
        Normalized phone number (plain digits)
    """
    wa_id = WaId.from_any_format(phone_input)
    return wa_id.plain_format


def validate_wa_id(phone_input: str) -> bool:
    """
    Check if a phone number is valid

    Args:
        phone_input: Phone number to validate

    Returns:
        True if valid, False otherwise
    """
    try:
        WaId.from_any_format(phone_input)
        return True
    except (PydanticCustomError, Exception):
        return False
