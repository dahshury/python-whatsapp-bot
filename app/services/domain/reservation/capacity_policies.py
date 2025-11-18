"""Slot capacity helpers shared by reservation services."""

from __future__ import annotations

from typing import Literal

from app.services.domain.config.config_schemas import (
    DEFAULT_AGENT_SLOT_CAPACITY,
    DEFAULT_SECRETARY_SLOT_CAPACITY,
    SlotCapacityConfig,
    SlotCapacityRoleConfig,
)
from app.services.domain.config.config_service import get_config

Role = Literal["agent", "secretary"]

_SECRETARY_SOURCES = {"frontend", "undo", "calendar", "ui", "secretary"}


def resolve_role_from_source(call_source: str | None) -> Role:
    """
    Map the provided call source to a capacity persona.

    Assistant/system agent calls are treated as "agent" while frontend/undo calls
    translate to "secretary" capacity limits.
    """
    if not call_source:
        return "agent"
    normalized = call_source.strip().lower()
    if normalized in _SECRETARY_SOURCES:
        return "secretary"
    return "agent"


def _safe_slot_capacity_config() -> SlotCapacityConfig:
    try:
        app_config = get_config()
        settings = getattr(app_config, "slot_capacity_settings", None)
        if isinstance(settings, SlotCapacityConfig):
            return settings
        if isinstance(settings, dict):
            return SlotCapacityConfig(**settings)
    except Exception:
        pass
    return SlotCapacityConfig()


def _role_config(role: Role) -> SlotCapacityRoleConfig:
    settings = _safe_slot_capacity_config()
    candidate = getattr(settings, role, None)
    if isinstance(candidate, SlotCapacityRoleConfig):
        return candidate
    if isinstance(candidate, dict):
        return SlotCapacityRoleConfig(**candidate)
    default_total = (
        DEFAULT_AGENT_SLOT_CAPACITY if role == "agent" else DEFAULT_SECRETARY_SLOT_CAPACITY
    )
    return SlotCapacityRoleConfig(total_max=default_total)


def compute_capacity_limits(
    reservation_type: int | None,
    *,
    role: Role,
    override_total: int | None = None,
) -> tuple[int, int]:
    """
    Resolve total/per-type slot capacity limits for the given persona.

    Args:
        reservation_type: Reservation type identifier (0/1/etc.)
        role: Persona to evaluate ("agent" or "secretary").
        override_total: Optional hard cap requested by the caller. The
            stricter value between config and override is applied.

    Returns:
        Tuple of (total_limit, per_type_limit).
    """
    role_settings = _role_config(role)
    total_limit = max(1, int(role_settings.total_max))
    if override_total is not None:
        total_limit = max(1, min(total_limit, int(override_total)))

    per_type_limit = total_limit
    if reservation_type is not None:
        desired = role_settings.per_type_max.get(str(reservation_type))
        if desired is not None:
            per_type_limit = max(0, min(int(desired), total_limit))

    return total_limit, per_type_limit

