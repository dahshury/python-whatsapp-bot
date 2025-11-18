from __future__ import annotations

from collections.abc import Callable, Mapping
from copy import deepcopy
from typing import Any

from app.services.system_agent_functions import (
    batch_cancel_reservations,
    batch_modify_reservations,
    batch_reserve_time_slots,
    get_reservation_snapshots,
)
from app.services.tool_schemas import FUNCTION_MAPPING as DEFAULT_FUNCTION_MAPPING
from app.services.tool_schemas import TOOL_DEFINITIONS as DEFAULT_TOOL_DEFINITIONS
from app.services.toolkit.registry import ToolRegistry

SHARED_TOOL_NAMES = (
    "get_current_datetime",
    "search_available_appointments",
)

_RESERVE_REQUEST_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "wa_id": {"type": "string", "description": "Customer WA ID to reserve for."},
        "customer_name": {"type": "string"},
        "date_str": {"type": "string"},
        "time_slot": {"type": "string"},
        "reservation_type": {"type": "integer"},
        "hijri": {"type": "boolean"},
        "max_reservations": {"type": "integer"},
        "ar": {"type": "boolean"},
    },
    "required": ["wa_id", "customer_name", "date_str", "time_slot", "reservation_type"],
    "additionalProperties": False,
}

_FILTER_PROPERTIES: dict[str, Any] = {
    "dates": {"type": "array", "items": {"type": "string"}},
    "start_date": {"type": "string"},
    "end_date": {"type": "string"},
    "wa_ids": {
        "description": "Single WA ID or list of IDs to filter.",
        "anyOf": [
            {"type": "array", "items": {"type": "string"}},
            {"type": "string"},
        ],
    },
    "include_cancelled": {"type": "boolean"},
    "reservation_types": {"type": "array", "items": {"type": "integer"}},
}

_FILTER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": deepcopy(_FILTER_PROPERTIES),
    "required": [],
    "additionalProperties": False,
}

_MODIFY_UPDATE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "new_date": {"type": "string", "description": "New reservation date (YYYY-MM-DD)."},
        "new_time_slot": {"type": "string", "description": "New time slot (12h or 24h)."},
        "new_name": {"type": "string", "description": "Updated customer display name."},
        "new_type": {"type": "integer", "description": "Reservation type (0 check-up, 1 follow-up)."},
        "new_wa_id": {"type": "string", "description": "New WA ID to assign to the affected reservation(s)."},
        "approximate": {"type": "boolean", "description": "Allow nearest slot substitution if occupied."},
        "hijri": {"type": "boolean", "description": "Treat provided dates/time slots as Hijri."},
        "max_reservations": {"type": "integer", "description": "Slot capacity guard when moving dates."},
        "ar": {"type": "boolean", "description": "Return localized copy in Arabic."},
    },
    "required": [],
    "additionalProperties": False,
}

_BASE_TOOL_LOOKUP = {definition["name"]: definition for definition in DEFAULT_TOOL_DEFINITIONS}
_SHARED_TOOL_DEFINITIONS: list[dict[str, Any]] = []
for tool_name in SHARED_TOOL_NAMES:
    schema = _BASE_TOOL_LOOKUP.get(tool_name)
    if schema:
        _SHARED_TOOL_DEFINITIONS.append(deepcopy(schema))

SYSTEM_TOOL_DEFINITIONS = [
    *_SHARED_TOOL_DEFINITIONS,
    {
        "name": "system_get_reservations",
        "description": (
            "Swiss-army data query. Combine fuzzy search, date/attribute filters, and the `include` list "
            "to fetch reservations, deduplicated WA IDs, or customer metadata (any combination). "
            "Use `include` to return only the sections you need; omit it to receive all three. "
            "Results always contain a `summary` block and each list is capped by `max_results` (default 200, max 500) to avoid huge outputs."
        ),
        "schema": {
            "type": "object",
            "properties": {
                "search_query": {
                    "type": "string",
                    "description": "Fuzzy search term (name, phone, or WA ID fragment).",
                },
                "wa_ids": {
                    "description": "Optional WA IDs to filter (single ID or list).",
                    "anyOf": [
                        {"type": "array", "items": {"type": "string"}},
                        {"type": "string"},
                    ],
                },
                "dates": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific dates (YYYY-MM-DD) to inspect.",
                },
                "start_date": {"type": "string", "description": "Range start (YYYY-MM-DD)."},
                "end_date": {"type": "string", "description": "Range end (YYYY-MM-DD)."},
                "include_cancelled": {"type": "boolean", "description": "Include cancelled reservations."},
                "reservation_types": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "Filter by reservation type values.",
                },
                "include": {
                    "type": "array",
                    "description": (
                        "Response sections to return. Valid values: `reservations`, `wa_ids`, `customers`. "
                        "If omitted, all sections are returned."
                    ),
                    "items": {
                        "type": "string",
                        "enum": ["reservations", "wa_ids", "customers"],
                    },
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum fuzzy search matches (default 50, max 200). Ignored if `search_query` is empty.",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum records returned per section (default 200, cap 500). Summary still reports total matches.",
                },
            },
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_batch_reserve",
        "description": (
            "Reserve time slots for one or many customers. Accepts either a single payload or an array. "
            "Each payload should include the reservation basics: `wa_id`, `customer_name`, `date_str`, `time_slot`, `reservation_type`, plus optional flags like `max_reservations`, `approximate`, `hijri`, or `ar`. "
            "Responses default to a compact summary (aggregate stats plus up to 50 sample rows); set `verbosity` to `detailed` to receive every per-request payload."
        ),
        "schema": {
            "type": "object",
            "properties": {
                "requests": {
                    "description": "Accepts either a single reservation payload or an array of payloads.",
                    "anyOf": [
                        {
                            "type": "array",
                            "minItems": 1,
                            "items": deepcopy(_RESERVE_REQUEST_SCHEMA),
                        },
                        deepcopy(_RESERVE_REQUEST_SCHEMA),
                    ],
                },
                "verbosity": {
                    "type": "string",
                    "enum": ["summary", "detailed"],
                    "description": "Response verbosity (default summary).",
                },
            },
            "additionalProperties": False,
            "required": ["requests"],
        },
    },
    {
        "name": "system_batch_modify",
        "description": (
            "Modify reservations via explicit `requests` (single or array) OR by supplying `filters` + `updates`. "
            "Filter-based discovery finds all matching reservations and applies the provided updates. "
            "`updates` can include `new_date`, `new_time_slot`, `new_name`, `new_type`, `new_wa_id`, etc. "
            "Summary responses include aggregate stats plus up to 50 sample rows; switch to `verbosity`=`detailed` for full dumps."
        ),
        "schema": {
            "type": "object",
            "properties": {
                "requests": {
                    "description": "Explicit payload(s) to modify. Provide either this or filters+updates.",
                    "anyOf": [
                        {"type": "array", "minItems": 1, "items": {"type": "object"}},
                        {"type": "object"},
                    ],
                },
                "filters": deepcopy(_FILTER_SCHEMA),
                "updates": deepcopy(_MODIFY_UPDATE_SCHEMA),
                "verbosity": {
                    "type": "string",
                    "enum": ["summary", "detailed"],
                    "description": "Compact summary by default; switch to `detailed` for full per-request records.",
                },
            },
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "name": "system_batch_cancel",
        "description": (
            "Cancel reservations via explicit payloads or by discovering matches from filters. "
            "Provide `requests` for precise control or `filters` to cancel every matching reservation (date range, wa_ids, types, etc.). "
            "Summary responses include aggregate stats plus up to 50 sample rows; switch to `verbosity`=`detailed` for all rows."
        ),
        "schema": {
            "type": "object",
            "properties": {
                "requests": {
                    "description": "Explicit payload(s) to cancel. Provide either this or filters.",
                    "anyOf": [
                        {"type": "array", "minItems": 1, "items": {"type": "object"}},
                        {"type": "object"},
                    ],
                },
                "filters": deepcopy(_FILTER_SCHEMA),
                "verbosity": {
                    "type": "string",
                    "enum": ["summary", "detailed"],
                    "description": "Compact summary by default; switch to `detailed` for full per-request records.",
                },
            },
            "required": [],
            "additionalProperties": False,
        },
    },
]

SHARED_FUNCTION_MAPPING = {
    name: DEFAULT_FUNCTION_MAPPING[name]
    for name in SHARED_TOOL_NAMES
    if name in DEFAULT_FUNCTION_MAPPING
}

SYSTEM_FUNCTION_MAPPING: Mapping[str, Callable[..., dict[str, Any]]] = {
    **SHARED_FUNCTION_MAPPING,
    "system_get_reservations": get_reservation_snapshots,
    "system_batch_reserve": batch_reserve_time_slots,
    "system_batch_modify": batch_modify_reservations,
    "system_batch_cancel": batch_cancel_reservations,
}

SYSTEM_TOOL_REGISTRY = ToolRegistry(
    name="system_agent",
    definitions=SYSTEM_TOOL_DEFINITIONS,
    functions=SYSTEM_FUNCTION_MAPPING,
)

