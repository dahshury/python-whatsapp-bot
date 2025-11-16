from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

from app.services.system_agent_functions import (
    batch_cancel_reservations,
    batch_modify_reservations,
    batch_reserve_time_slots,
    cancel_reservations_in_range,
    get_available_slots_batch,
    get_reservation_snapshots,
    get_wa_ids_for_filters,
    move_reservations_between_dates,
    search_customers,
)
from app.services.toolkit.registry import ToolRegistry

SYSTEM_TOOL_DEFINITIONS = [
    {
        "name": "system_get_reservations",
        "description": "Retrieve reservation snapshots for auditing or planning.",
        "schema": {
            "type": "object",
            "properties": {
                "dates": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific dates (YYYY-MM-DD) to inspect.",
                },
                "start_date": {"type": "string", "description": "Range start (YYYY-MM-DD)."},
                "end_date": {"type": "string", "description": "Range end (YYYY-MM-DD)."},
                "wa_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of WA IDs to filter.",
                },
                "include_cancelled": {"type": "boolean", "description": "Include cancelled reservations."},
                "reservation_types": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "Filter by reservation type values.",
                },
            },
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_get_wa_ids",
        "description": "List distinct WA IDs that match reservation filters.",
        "schema": {
            "type": "object",
            "properties": {
                "dates": {"type": "array", "items": {"type": "string"}},
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
                "include_cancelled": {"type": "boolean"},
                "reservation_types": {"type": "array", "items": {"type": "integer"}},
            },
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_move_reservations",
        "description": "Move all reservations from one date to a new date.",
        "schema": {
            "type": "object",
            "properties": {
                "source_date": {"type": "string", "description": "Date to move from (YYYY-MM-DD)."},
                "target_date": {"type": "string", "description": "Date to move to (YYYY-MM-DD)."},
                "approximate": {"type": "boolean", "description": "Allow nearest slot substitution."},
                "hijri": {"type": "boolean"},
                "max_reservations": {"type": "integer", "description": "Slot capacity guard."},
            },
            "required": ["source_date", "target_date"],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_cancel_reservations",
        "description": "Cancel every reservation within a date range or explicit WA ID list.",
        "schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
                "wa_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_batch_reserve",
        "description": "Reserve time slots for multiple customers.",
        "schema": {
            "type": "object",
            "properties": {
                "requests": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "wa_id": {"type": "string"},
                            "customer_name": {"type": "string"},
                            "date_str": {"type": "string"},
                            "time_slot": {"type": "string"},
                            "reservation_type": {"type": "integer"},
                            "hijri": {"type": "boolean"},
                            "max_reservations": {"type": "integer"},
                            "ar": {"type": "boolean"},
                        },
                        "required": ["wa_id", "customer_name", "date_str", "time_slot", "reservation_type"],
                    },
                }
            },
            "required": ["requests"],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_batch_modify",
        "description": "Modify reservations for multiple customers.",
        "schema": {
            "type": "object",
            "properties": {
                "requests": {
                    "type": "array",
                    "items": {"type": "object"},
                }
            },
            "required": ["requests"],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_batch_cancel",
        "description": "Cancel reservations via explicit payloads (wa_id + reservation_id/date).",
        "schema": {
            "type": "object",
            "properties": {
                "requests": {
                    "type": "array",
                    "items": {"type": "object"},
                }
            },
            "required": ["requests"],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_search_customers",
        "description": "Fuzzy search customers/phones using the phone selector service.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "description": "Maximum results (default 50)."},
            },
            "required": ["query"],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_available_slots_batch",
        "description": "Fetch availability snapshots for multiple dates.",
        "schema": {
            "type": "object",
            "properties": {
                "dates": {"type": "array", "items": {"type": "string"}},
                "max_reservations": {"type": "integer"},
                "hijri": {"type": "boolean"},
            },
            "required": ["dates"],
            "additionalProperties": False,
        },
    },
]

SYSTEM_FUNCTION_MAPPING: Mapping[str, Callable[..., dict[str, Any]]] = {
    "system_get_reservations": get_reservation_snapshots,
    "system_get_wa_ids": get_wa_ids_for_filters,
    "system_move_reservations": move_reservations_between_dates,
    "system_cancel_reservations": cancel_reservations_in_range,
    "system_batch_reserve": batch_reserve_time_slots,
    "system_batch_modify": batch_modify_reservations,
    "system_batch_cancel": batch_cancel_reservations,
    "system_search_customers": search_customers,
    "system_available_slots_batch": get_available_slots_batch,
}

SYSTEM_TOOL_REGISTRY = ToolRegistry(
    name="system_agent",
    definitions=SYSTEM_TOOL_DEFINITIONS,
    functions=SYSTEM_FUNCTION_MAPPING,
)

