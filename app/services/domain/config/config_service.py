"""Service for managing app configuration."""

import datetime
import json
import logging

from hijri_converter import convert
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.services.domain.config.config_models import AppConfigModel
from app.services.domain.config.config_schemas import (
    AppConfigBase,
    AppConfigCreate,
    AppConfigRead,
    AppConfigUpdate,
    CustomCalendarRangeConfig,
    DaySpecificSlotDuration,
    DaySpecificWorkingHours,
    EventColorsConfig,
    NotificationPreferencesConfig,
)

logger = logging.getLogger(__name__)

# Singleton instance cache
_config_cache: AppConfigRead | None = None


def _normalize_event_colors_payload(payload: object) -> dict[str, object]:
    """Ensure event_colors payload matches EventColorsConfig structure."""
    if not isinstance(payload, dict):
        return EventColorsConfig().model_dump(mode="json")

    normalized = dict(payload)

    # Collapse legacy light/dark document stroke settings into a single value
    if "document_stroke_color" not in normalized:
        stroke_color = normalized.pop("document_stroke_color_light", None)
        stroke_color = stroke_color or normalized.pop("document_stroke_color_dark", None)
        if stroke_color:
            normalized["document_stroke_color"] = stroke_color
    else:
        normalized.pop("document_stroke_color_light", None)
        normalized.pop("document_stroke_color_dark", None)

    try:
        return EventColorsConfig(**normalized).model_dump(mode="json")
    except Exception:
        # Fallback to defaults if payload is invalid
        return EventColorsConfig().model_dump(mode="json")


def _normalize_notification_preferences_payload(payload: object) -> dict[str, object]:
    """Ensure notification_preferences payload matches NotificationPreferencesConfig structure."""
    if not isinstance(payload, dict):
        return NotificationPreferencesConfig().model_dump(mode="json")

    try:
        return NotificationPreferencesConfig(**payload).model_dump(mode="json")
    except Exception:
        return NotificationPreferencesConfig().model_dump(mode="json")


def _generate_ramadan_ranges() -> list[CustomCalendarRangeConfig]:
    """Generate Ramadan date ranges for 2022-2031."""
    ranges: list[CustomCalendarRangeConfig] = []
    RAMADAN_MONTH = 9  # Hijri month 9 is Ramadan

    try:
        start_date = datetime.date(2022, 1, 1)
        end_date = datetime.date(2031, 12, 31)
        current_date = start_date
        in_ramadan = False
        range_start: datetime.date | None = None

        while current_date <= end_date:
            try:
                # Convert to Hijri
                hijri = convert.Gregorian(
                    current_date.year, current_date.month, current_date.day
                ).to_hijri()
                is_ramadan = hijri.month == RAMADAN_MONTH

                if is_ramadan and not in_ramadan:
                    # Start of Ramadan period
                    in_ramadan = True
                    range_start = current_date
                elif not is_ramadan and in_ramadan and range_start:
                    # End of Ramadan period
                    range_end = current_date - datetime.timedelta(days=1)
                    ranges.append(
                        CustomCalendarRangeConfig(
                            name="Ramadan",
                            start_date=range_start,
                            end_date=range_end,
                            working_days=[0, 1, 2, 3, 4, 6],  # Sun-Thu, Sat
                            start_time="10:00",
                            end_time="16:00",
                            slot_duration_hours=None,  # Use default
                        )
                    )
                    in_ramadan = False
                    range_start = None

                current_date += datetime.timedelta(days=1)
            except Exception:
                # Skip dates that can't be converted
                current_date += datetime.timedelta(days=1)
                continue

        # Handle case where Ramadan extends to end date
        if in_ramadan and range_start:
            ranges.append(
                CustomCalendarRangeConfig(
                    name="Ramadan",
                    start_date=range_start,
                    end_date=end_date,
                    working_days=[0, 1, 2, 3, 4, 6],
                    start_time="10:00",
                    end_time="16:00",
                    slot_duration_hours=None,
                )
            )
    except Exception as e:
        logger.warning(f"Failed to generate Ramadan ranges: {e}")

    return ranges


def get_default_config() -> AppConfigBase:
    """Get default configuration values."""
    from app.services.domain.config.config_schemas import (
        ColumnConfig,
        WorkingHoursConfig,
    )

    # Default calendar columns: scheduled_time, phone, type, name
    calendar_columns = [
        ColumnConfig(
            id="scheduled_time",
            name="scheduled_time",
            title="field_time_scheduled",
            data_type="datetime",
            is_editable=True,
            is_required=True,
            width=170,
        ),
        ColumnConfig(
            id="phone",
            name="phone",
            title="field_phone",
            data_type="phone",
            is_editable=True,
            is_required=True,
            width=150,
        ),
        ColumnConfig(
            id="type",
            name="type",
            title="field_type",
            data_type="dropdown",
            is_editable=True,
            is_required=True,
            width=100,
            metadata={"options": ["appt_checkup", "appt_followup"]},
        ),
        ColumnConfig(
            id="name",
            name="name",
            title="field_name",
            data_type="text",
            is_editable=True,
            is_required=True,
            width=150,
        ),
    ]

    # Default documents columns: name, age, phone
    documents_columns = [
        ColumnConfig(
            id="name",
            name="name",
            title="field_name",
            data_type="text",
            is_editable=True,
            is_required=True,
            width=150,
        ),
        ColumnConfig(
            id="age",
            name="age",
            title="field_age",
            data_type="number",
            is_editable=True,
            is_required=False,
            width=50,
            metadata={"useWheel": True},
        ),
        ColumnConfig(
            id="phone",
            name="phone",
            title="field_phone",
            data_type="phone",
            is_editable=True,
            is_required=True,
            width=150,
        ),
    ]

    # Generate Ramadan ranges
    ramadan_ranges = _generate_ramadan_ranges()

    # Default day-specific hours: Saturday has different hours
    day_specific_hours = [
        DaySpecificWorkingHours(
            day_of_week=6,  # Saturday
            start_time="16:00",
            end_time="22:00",
        )
    ]

    # Default day-specific slot durations: empty by default (all days use default)
    day_specific_slot_durations: list[DaySpecificSlotDuration] = []

    return AppConfigBase(
        working_days=[0, 1, 2, 3, 4, 6],  # Sunday through Thursday, Saturday
        default_working_hours=WorkingHoursConfig(
            days_of_week=[0, 1, 2, 3, 4],
            start_time="11:00",
            end_time="17:00",
        ),
        day_specific_hours=day_specific_hours,
        slot_duration_hours=2,
        day_specific_slot_durations=day_specific_slot_durations,
        custom_calendar_ranges=ramadan_ranges,
        calendar_columns=calendar_columns,
        documents_columns=documents_columns,
        default_country_prefix="SA",
        available_languages=["en", "ar"],
    )


def get_config(session: Session | None = None) -> AppConfigRead:
    """Get current app configuration, creating default if none exists."""
    global _config_cache

    # Use cache if available
    if _config_cache is not None:
        return _config_cache

    should_close = False
    if session is None:
        session = get_session()
        should_close = True

    try:
        # Try to get existing config
        stmt = select(AppConfigModel).order_by(AppConfigModel.id.desc()).limit(1)
        result = session.execute(stmt)
        config_model = result.scalar_one_or_none()

        if config_model:
            # Parse JSON and create AppConfigRead
            config_dict = json.loads(config_model.config_data)

            if "event_colors" in config_dict:
                config_dict["event_colors"] = _normalize_event_colors_payload(
                    config_dict["event_colors"]
                )
            else:
                config_dict["event_colors"] = EventColorsConfig().model_dump(mode="json")

            if "notification_preferences" in config_dict:
                config_dict["notification_preferences"] = _normalize_notification_preferences_payload(
                    config_dict["notification_preferences"]
                )
            else:
                config_dict["notification_preferences"] = (
                    NotificationPreferencesConfig().model_dump(mode="json")
                )

            # Migration: Convert old saturday_working_hours to day_specific_hours
            needs_migration = False
            if "saturday_working_hours" in config_dict:
                saturday_hours = config_dict.pop("saturday_working_hours")
                if "day_specific_hours" not in config_dict:
                    if saturday_hours:
                        config_dict["day_specific_hours"] = [
                            {
                                "day_of_week": 6,  # Saturday
                                "start_time": saturday_hours.get("start_time", "16:00"),
                                "end_time": saturday_hours.get("end_time", "22:00"),
                            }
                        ]
                    else:
                        config_dict["day_specific_hours"] = []
                    needs_migration = True

            config_base = AppConfigBase(**config_dict)

            # Migrate: Add Ramadan ranges if custom_calendar_ranges is empty
            if not config_base.custom_calendar_ranges:
                ramadan_ranges = _generate_ramadan_ranges()
                if ramadan_ranges:
                    config_base.custom_calendar_ranges = ramadan_ranges
                    needs_migration = True

            if needs_migration:
                # Update database with migrated config
                config_model.config_data = json.dumps(
                    config_base.model_dump(mode="json"), default=str
                )
                session.commit()
                session.refresh(config_model)
                logger.info("Migrated config: Updated structure")

            _config_cache = AppConfigRead(
                id=config_model.id,
                created_at=config_model.created_at.isoformat(),
                updated_at=config_model.updated_at.isoformat(),
                **config_base.model_dump(),
            )
        else:
            # Create default config
            default_config = get_default_config()
            config_dict = default_config.model_dump(mode="json")
            config_json = json.dumps(config_dict, default=str)

            config_model = AppConfigModel(config_data=config_json)
            session.add(config_model)
            session.commit()
            session.refresh(config_model)

            _config_cache = AppConfigRead(
                id=config_model.id,
                created_at=config_model.created_at.isoformat(),
                updated_at=config_model.updated_at.isoformat(),
                **default_config.model_dump(),
            )
            logger.info("Created default app configuration")

        return _config_cache
    finally:
        if should_close and session:
            session.close()


def update_config(
    update_data: AppConfigUpdate, session: Session | None = None
) -> AppConfigRead:
    """Update app configuration."""
    global _config_cache

    should_close = False
    if session is None:
        session = get_session()
        should_close = True

    try:
        # Get current config
        current_config = get_config(session)
        current_dict = current_config.model_dump(exclude={"id", "created_at", "updated_at"})

        # Merge updates
        update_dict = update_data.model_dump(exclude_unset=True)
        updated_dict = {**current_dict, **update_dict}

        # Validate by creating AppConfigBase
        updated_config = AppConfigBase(**updated_dict)

        # Save to database
        stmt = select(AppConfigModel).order_by(AppConfigModel.id.desc()).limit(1)
        result = session.execute(stmt)
        config_model = result.scalar_one_or_none()

        if not config_model:
            # Create new if doesn't exist
            config_model = AppConfigModel(config_data="{}")
            session.add(config_model)
            session.flush()

        config_model.config_data = json.dumps(updated_config.model_dump(mode="json"), default=str)
        session.commit()
        session.refresh(config_model)

        # Clear cache
        _config_cache = None

        # Return updated config
        return get_config(session)
    finally:
        if should_close and session:
            session.close()


def create_config(config_data: AppConfigCreate, session: Session | None = None) -> AppConfigRead:
    """Create new app configuration (replaces existing)."""
    global _config_cache

    should_close = False
    if session is None:
        session = get_session()
        should_close = True

    try:
        # Delete existing configs
        stmt = select(AppConfigModel)
        result = session.execute(stmt)
        existing = result.scalars().all()
        for existing_config in existing:
            session.delete(existing_config)

        # Create new config
        config_dict = config_data.model_dump(mode="json")
        config_json = json.dumps(config_dict, default=str)

        config_model = AppConfigModel(config_data=config_json)
        session.add(config_model)
        session.commit()
        session.refresh(config_model)

        # Clear cache
        _config_cache = None

        return get_config(session)
    finally:
        if should_close and session:
            session.close()


def clear_config_cache() -> None:
    """Clear the configuration cache (useful for testing or after updates)."""
    global _config_cache
    _config_cache = None

