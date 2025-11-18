from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from app.services.domain.system_agent import SystemAgentBatchService
from app.utils import format_response

_service = SystemAgentBatchService()


def _normalize_requests(payload: Sequence[dict[str, Any]] | Mapping[str, Any] | None) -> list[dict[str, Any]]:
    """
    Accept either a list/tuple of payloads or a single mapping and return a list copy.
    This makes it easy for the LLM to issue single-customer mutations without crafting arrays.
    """
    if payload is None:
        return []
    if isinstance(payload, Mapping):
        return [dict(payload)]
    if isinstance(payload, Sequence) and not isinstance(payload, str | bytes):
        return [dict(entry) for entry in payload]
    raise TypeError("Requests payload must be a mapping, sequence of mappings, or None.")


_FILTER_KEYS = {"dates", "start_date", "end_date", "wa_ids", "include_cancelled", "reservation_types"}


def _normalize_filters(filters: Mapping[str, Any] | None) -> dict[str, Any]:
    if filters is None:
        return {}
    if not isinstance(filters, Mapping):
        raise TypeError("Filters must be a mapping.")
    normalized: dict[str, Any] = {}
    for key in _FILTER_KEYS:
        value = filters.get(key)
        if value is None:
            continue
        if key == "wa_ids":
            if isinstance(value, str):
                value = [value]
            elif isinstance(value, Sequence) and not isinstance(value, list | tuple):
                value = list(value)
        normalized[key] = value
    return normalized


def _normalize_updates(updates: Mapping[str, Any] | None) -> dict[str, Any]:
    if updates is None:
        return {}
    if not isinstance(updates, Mapping):
        raise TypeError("Updates must be a mapping.")
    normalized: dict[str, Any] = {}
    for key, value in updates.items():
        if value is None:
            continue
        normalized[key] = value
    return normalized


def batch_reserve_time_slots(
    requests: Sequence[dict[str, Any]] | Mapping[str, Any] | None = None,
    *,
    verbosity: str = "summary",
) -> dict[str, Any]:
    """Reserve time slots for one or more customers in one call."""
    return _service.batch_reserve(_normalize_requests(requests), verbosity=verbosity)


def batch_modify_reservations(
    requests: Sequence[dict[str, Any]] | Mapping[str, Any] | None = None,
    *,
    filters: Mapping[str, Any] | None = None,
    updates: Mapping[str, Any] | None = None,
    verbosity: str = "summary",
) -> dict[str, Any]:
    """
    Modify reservations for one or more customers.

    If `requests` are omitted but filters and updates are provided, the service will discover
    matching reservations automatically and apply the provided updates.
    """
    normalized_requests = _normalize_requests(requests)
    if normalized_requests:
        return _service.batch_modify(normalized_requests, verbosity=verbosity)

    filter_kwargs = _normalize_filters(filters)
    update_kwargs = _normalize_updates(updates)

    if not filter_kwargs or not update_kwargs:
        return format_response(
            False,
            message="Provide either explicit requests or filters together with updates for auto-discovery.",
        )

    snapshot = _service.get_reservations(**filter_kwargs)
    if not snapshot.get("success"):
        return snapshot

    payloads: list[dict[str, Any]] = []
    for entry in snapshot.get("data", []):
        payload = {"wa_id": entry.get("wa_id"), "reservation_id_to_modify": entry.get("id")}
        payload.update(update_kwargs)
        new_wa = update_kwargs.get("new_wa_id")
        if isinstance(new_wa, str) and new_wa.strip():
            payload["new_wa_id"] = new_wa.strip()
        payloads.append(payload)

    if not payloads:
        return format_response(True, data=[], message="No reservations matched the provided filters.")

    return _service.batch_modify(payloads, verbosity=verbosity)


def batch_cancel_reservations(
    requests: Sequence[dict[str, Any]] | Mapping[str, Any] | None = None,
    *,
    filters: Mapping[str, Any] | None = None,
    verbosity: str = "summary",
) -> dict[str, Any]:
    """
    Cancel reservations for one or more customers.

    If `requests` are omitted but filters are provided, the service will discover matching reservations automatically.
    """
    normalized_requests = _normalize_requests(requests)
    if normalized_requests:
        return _service.batch_cancel(normalized_requests, verbosity=verbosity)

    filter_kwargs = _normalize_filters(filters)
    if not filter_kwargs:
        return format_response(False, message="Provide explicit requests or filters for auto-discovery.")

    snapshot = _service.get_reservations(**filter_kwargs, include_cancelled=True)
    if not snapshot.get("success"):
        return snapshot

    payloads: list[dict[str, Any]] = []
    for entry in snapshot.get("data", []):
        if entry.get("status") == "cancelled":
            continue
        payloads.append(
            {
                "wa_id": entry.get("wa_id"),
                "reservation_id_to_cancel": entry.get("id"),
                "date_str": entry.get("date"),
            }
        )

    if not payloads:
        return format_response(True, data=[], message="No active reservations matched the provided filters.")

    return _service.batch_cancel(payloads, verbosity=verbosity)


def get_reservation_snapshots(
    *,
    search_query: str | None = None,
    wa_ids: Sequence[str] | str | None = None,
    dates: Sequence[str] | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    include_cancelled: bool = False,
    reservation_types: Sequence[int] | None = None,
    include: Sequence[str] | None = None,
    limit: int = 50,
    max_results: int | None = None,
) -> dict[str, Any]:
    """
    Flexible query helper for reservations, WA IDs, and customer metadata.
    """
    return _service.query_customers_and_reservations(
        search_query=search_query,
        wa_ids=wa_ids,
        dates=dates,
        start_date=start_date,
        end_date=end_date,
        include_cancelled=include_cancelled,
        reservation_types=reservation_types,
        include=include,
        limit=limit,
        max_results=max_results,
    )


def get_available_slots_batch(
    dates: Sequence[str],
    *,
    max_reservations: int | None = None,
    hijri: bool = False,
) -> dict[str, Any]:
    """Retrieve availability snapshots for multiple dates."""
    return _service.get_available_time_slots_batch(dates, max_reservations=max_reservations, hijri=hijri)


