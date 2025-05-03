# Centralized definitions of functions/tools for LLM providers.
import inspect
from app.services import assistant_functions

TOOL_DEFINITIONS = [
    {
        "name": "send_business_location",
        "description": "Sends the business WhatsApp location message using the WhatsApp API. Send this message always when the user asks for the business location.",
        "schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}
    },
    {
        "name": "get_current_datetime",
        "description": "Gets the current date and time in both Hijri and Gregorian calendars. Always use this as the reference point for every message in all date-related operations. Never assume you know the current date or time without checking. Always check the current date and time before suggesting any dates or times.",
        "schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}
    },
    {
        "name": "get_customer_reservations",
        "description": "Get all reservations of the user. If no include_past is provided, defaults to False.",
        "schema": {"type": "object", "properties": {"include_past": {"type": "boolean", "description": "Flag to include past reservations. defaults to False."}}, "required": [], "additionalProperties": False}
    },
    {
        "name": "get_available_time_slots",
        "description": "Gets the available time slots for a given date. Returns only time slots that have availability for the given date.",
        "schema": {"type": "object", "properties": {"date_str": {"type": "string", "description": "Date string in ISO 8601 format 'YYYY-MM-DD' to get available time slots for. If 'hijri' is true, The input date to this function should be in the format (YYYY-MM-DD)."}, "hijri": {"type": "boolean", "description": "Flag indicating if the provided input date string to this function is in Hijri format. The hijri date should be in the format (YYYY-MM-DD). defaults to False."}}, "required": ["date_str"], "additionalProperties": False}
    },
    {
        "name": "search_available_appointments",
        "description": "Get the available nearby dates for a given time slot within a specified range of days. If no time_slot is provided, returns all available time slots for each date in the range. If no start_date is provided, defaults to today.",
        "schema": {"type": "object", "properties": {"start_date": {"type": "string", "description": "The date to start searching from (format: YYYY-MM-DD), defaults to today"}, "time_slot": {"type": "string", "description": "The time slot to check availability for (can be 12-hour or 24-hour format). If not provided, all available time slots for each date are returned."}, "days_forward": {"type": "integer", "description": "Number of days to look forward for availability, must be a non-negative integer. defaults to 3."}, "days_backward": {"type": "integer", "description": "Number of days to look backward for availability, must be a non-negative integer. defaults to 0."}, "max_reservations": {"type": "integer", "description": "Maximum reservations per slot. defaults to 5."}, "hijri": {"type": "boolean", "description": "Flag to indicate if the provided date is in Hijri format and if output dates should be in Hijri. defaults to False."}}, "required": [], "additionalProperties": False}
    },
    {
        "name": "reserve_time_slot",
        "description": "Reserves a time slot for a customer on a specific date.",
        "schema": {"type": "object", "properties": {"customer_name": {"type": "string", "description": "Name of the customer making the reservation. This is required always. Never reserve without it. Ensure it's the full name if available; otherwise, use the first and last name."}, "date_str": {"type": "string", "description": "Date for the reservation in ISO format (e.g., 'YYYY-MM-DD'). This is required always. Never reserve without it. Make sure the user chooses it."}, "time_slot": {"type": "string", "description": "The specific time slot the customer wants to reserve in 12-hour format (e.g., '03:30 PM'). This is required always. Never reserve without it. Make sure the user chooses it."}, "reservation_type": {"type": "integer", "enum": [0, 1], "description": "Type of reservation. 0 for Check-Up, 1 for Follow-Up. This is required always. Never reserve without it. Make sure the user chooses it."}, "hijri": {"type": "boolean", "description": "Flag indicating if the provided input date string to this function is in Hijri format. The hijri date should be in the format (YYYY-MM-DD). This is required always. Never reserve without it. defaults to False."}}, "required": ["customer_name", "date_str", "time_slot", "reservation_type"], "additionalProperties": False}
    },
    {
        "name": "modify_reservation",
        "description": "Modifies a reservation for an existing customer. Only provide the fields that are being modified.",
        "schema": {"type": "object", "properties": {"new_date": {"type": "string", "description": "New date for the reservation in ISO format (YYYY-MM-DD)."}, "new_time_slot": {"type": "string", "description": "New time slot (expected format: '%I:%M %p', e.g., '11:00 AM')."}, "new_name": {"type": "string", "description": "New customer name."}, "new_type": {"type": "integer", "description": "Reservation type (0 for Check-Up, 1 for Follow-Up)."}, "hijri": {"type": "boolean", "description": "Flag indicating if the provided input date string to this function is in Hijri format. The hijri date should be in the format (YYYY-MM-DD). defaults to False."}}, "required": [], "additionalProperties": False}
    },
    {
        "name": "cancel_reservation",
        "description": "Cancels a reservation for a customer. If date_str is not provided, cancels all reservations for the customer.",
        "schema": {"type": "object", "properties": {"date_str": {"type": "string", "description": "Date for the reservation in ISO format (e.g., 'YYYY-MM-DD'). If not provided, all reservations are cancelled."}}, "required": [], "additionalProperties": False},
        "cache_control": {"type": "ephemeral"}
    },
] 

FUNCTION_MAPPING = {
    name: func for name, func in inspect.getmembers(assistant_functions)
    if inspect.isfunction(func)
}