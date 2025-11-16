from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from app.services.domain.system_agent import SystemAgentBatchService
from app.utils import format_response

_service = SystemAgentBatchService()


def batch_reserve_time_slots(requests: Sequence[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Reserve time slots for multiple customers in one call."""
    return _service.batch_reserve(list(requests or []))


def batch_modify_reservations(requests: Sequence[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Modify reservations for multiple customers."""
    return _service.batch_modify(list(requests or []))


def batch_cancel_reservations(requests: Sequence[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Cancel reservations for multiple customers."""
    return _service.batch_cancel(list(requests or []))


def move_reservations_between_dates(
    source_date: str,
    target_date: str,
    *,
    approximate: bool = True,
    hijri: bool = False,
    max_reservations: int = 5,
) -> dict[str, Any]:
    """
    Move all reservations from one date to another, preserving reservation IDs when possible.
    """
    snapshot = _service.get_reservations(dates=[source_date])
    if not snapshot.get("success"):
        return snapshot

    payloads: list[dict[str, Any]] = []
    for entry in snapshot.get("data", []):
        payloads.append(
            {
                "wa_id": entry.get("wa_id"),
                "new_date": target_date,
                "approximate": approximate,
                "hijri": hijri,
                "max_reservations": max_reservations,
                "reservation_id_to_modify": entry.get("id"),
            }
        )

    if not payloads:
        return format_response(True, data=[], message="No reservations found to move.")

    return _service.batch_modify(payloads)


def cancel_reservations_in_range(
    *,
    start_date: str | None = None,
    end_date: str | None = None,
    wa_ids: Sequence[str] | None = None,
) -> dict[str, Any]:
    """
    Cancel all reservations that fall within the specified date range (or explicit dates).
    """
    snapshot = _service.get_reservations(start_date=start_date, end_date=end_date, wa_ids=wa_ids, include_cancelled=True)
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
        return format_response(True, data=[], message="No active reservations found to cancel.")
    return _service.batch_cancel(payloads)


def get_reservation_snapshots(
    *,
    dates: Sequence[str] | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    wa_ids: Sequence[str] | None = None,
    include_cancelled: bool = False,
    reservation_types: Sequence[int] | None = None,
) -> dict[str, Any]:
    """Fetch raw reservation data for auditing or planning."""
    return _service.get_reservations(
        dates=dates,
        start_date=start_date,
        end_date=end_date,
        wa_ids=wa_ids,
        include_cancelled=include_cancelled,
        reservation_types=reservation_types,
    )


def get_wa_ids_for_filters(
    *,
    dates: Sequence[str] | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    include_cancelled: bool = False,
    reservation_types: Sequence[int] | None = None,
) -> dict[str, Any]:
    """Return distinct WA IDs for the provided filters."""
    return _service.list_wa_ids_for_filters(
        dates=dates,
        start_date=start_date,
        end_date=end_date,
        include_cancelled=include_cancelled,
        reservation_types=reservation_types,
    )


def search_customers(query: str, limit: int = 50) -> dict[str, Any]:
    """Reuse phone selector fuzzy search for operator prompts."""
    return _service.search_customers(query, limit=limit)


def get_available_slots_batch(
    dates: Sequence[str],
    *,
    max_reservations: int = 5,
    hijri: bool = False,
) -> dict[str, Any]:
    """Retrieve availability snapshots for multiple dates."""
    return _service.get_available_time_slots_batch(dates, max_reservations=max_reservations, hijri=hijri)

