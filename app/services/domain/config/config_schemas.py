"""Pydantic schemas for app configuration."""

from datetime import date
from typing import Literal, cast
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator, model_validator

DEFAULT_TIMEZONE = "Asia/Riyadh"
DEFAULT_LLM_PROVIDER = "openai"
SUPPORTED_LLM_PROVIDERS = {"openai", "anthropic", "gemini"}

DEFAULT_EVENT_TYPE_COLORS: dict[str, dict[str, str]] = {
    "0": {"background": "#e2eee9", "border": "#12b981"},
    "1": {"background": "#e2e8f4", "border": "#3c82f6"},
    "2": {"background": "#edae49", "border": "#edae49"},
}
DEFAULT_DOCUMENT_STROKE_COLOR = "#facc15"

DEFAULT_AVAILABLE_THEMES = [
    "theme-default",
    "theme-clerk",
    "theme-amethyst-haze",
    "theme-claude",
    "theme-art-deco",
    "theme-neo-brutalism",
    "theme-perpetuity",
    "theme-retro-arcade",
    "theme-soft-pop",
    "theme-ghibli-studio",
    "theme-valorant",
    "theme-t3chat",
    "theme-perplexity",
    "theme-neomorphism",
    "theme-inline",
]

DEFAULT_CALENDAR_VIEWS = [
    "timeGridWeek",
    "dayGridMonth",
    "dayGridWeek",
    "listMonth",
    "multiMonthYear",
]

ALLOWED_EVENT_TYPE_IDS: tuple[str, ...] = ("0", "1", "2")
DEFAULT_EVENT_DURATION_MINUTES = 20
MIN_EVENT_DURATION_MINUTES = 5
MAX_EVENT_DURATION_MINUTES = 8 * 60  # Up to 8 hours
DEFAULT_AGENT_SLOT_CAPACITY = 5
DEFAULT_SECRETARY_SLOT_CAPACITY = 6
MAX_SLOT_CAPACITY_PER_TYPE = 50


class EventTypeColor(BaseModel):
    """Background/border pair for a specific event type."""

    background: str = Field(description="Hex color used for the event background")
    border: str = Field(description="Hex color used for the event border/stroke")


def _default_event_type_color_map() -> dict[str, EventTypeColor | str]:
    return cast(
        dict[str, EventTypeColor | str],
        {key: EventTypeColor(**value) for key, value in DEFAULT_EVENT_TYPE_COLORS.items()},
    )


class EventColorsConfig(BaseModel):
    """Color configuration for typed events inside FullCalendar."""

    default_event_color: str = Field(
        default=DEFAULT_EVENT_TYPE_COLORS["2"]["background"],
        description="Fallback color for events without an explicit type",
    )
    event_color_by_type: dict[str, EventTypeColor | str] = Field(
        default_factory=_default_event_type_color_map,
        description="Mapping of reservation type -> colors. Supports legacy string values.",
    )
    use_event_colors: bool = Field(
        default=True, description="Whether event type colors are enabled"
    )
    event_color_by_status: dict[str, str] | None = Field(
        default=None, description="Optional overrides by event status"
    )
    event_color_by_priority: dict[str, str] | None = Field(
        default=None, description="Optional overrides by event priority"
    )
    document_stroke_color: str = Field(
        default=DEFAULT_DOCUMENT_STROKE_COLOR,
        description="Stroke color applied to events that include uploaded documents",
    )



class WorkingHoursConfig(BaseModel):
    """Configuration for working hours on specific days."""

    days_of_week: list[int] = Field(
        default=[0, 1, 2, 3, 4, 6],
        description="Days of week (0=Sunday, 6=Saturday). Friday (5) is excluded by default.",
    )
    start_time: str = Field(
        default="11:00",
        description="Start time in HH:MM format",
    )
    end_time: str = Field(
        default="17:00",
        description="End time in HH:MM format",
    )

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        """Validate time format HH:MM."""
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError("Time must be in HH:MM format")
        hour, minute = int(parts[0]), int(parts[1])
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("Invalid time values")
        return v


class DaySpecificWorkingHours(BaseModel):
    """Configuration for working hours on a specific day of the week."""

    day_of_week: int = Field(
        ge=0,
        le=6,
        description="Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)",
    )
    start_time: str = Field(
        description="Start time in HH:MM format",
    )
    end_time: str = Field(
        description="End time in HH:MM format",
    )

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        """Validate time format HH:MM."""
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError("Time must be in HH:MM format")
        hour, minute = int(parts[0]), int(parts[1])
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("Invalid time values")
        return v


class DaySpecificSlotDuration(BaseModel):
    """Configuration for slot duration on a specific day of the week."""

    day_of_week: int = Field(
        ge=0,
        le=6,
        description="Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)",
    )
    slot_duration_hours: int = Field(
        ge=1,
        le=24,
        description="Slot duration in hours for this day",
    )


class CustomCalendarRangeConfig(BaseModel):
    """Configuration for custom calendar ranges (e.g., Ramadan hours)."""

    name: str = Field(description="Name of the custom range (e.g., 'Ramadan')")
    start_date: date = Field(description="Start date of the custom range")
    end_date: date = Field(description="End date of the custom range")
    working_days: list[int] = Field(
        default=[0, 1, 2, 3, 4, 6],
        description="Days of week that are working days during this range",
    )
    start_time: str = Field(description="Start time in HH:MM format")
    end_time: str = Field(description="End time in HH:MM format")
    slot_duration_hours: int | None = Field(
        default=None,
        description="Override slot duration for this range (hours). If None, uses default.",
    )

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        """Validate time format HH:MM."""
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError("Time must be in HH:MM format")
        hour, minute = int(parts[0]), int(parts[1])
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("Invalid time values")
        return v

    @model_validator(mode="after")
    def validate_date_range(self) -> "CustomCalendarRangeConfig":
        """Validate that end_date is after start_date."""
        if self.end_date < self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class ColumnConfig(BaseModel):
    """Configuration for a data grid column."""

    id: str = Field(description="Unique column identifier")
    name: str = Field(description="Column name/key")
    title: str = Field(description="Display title (can be i18n key)")
    data_type: str = Field(
        description="Column data type: text, number, datetime, phone, dropdown"
    )
    is_editable: bool = Field(default=True, description="Whether column is editable")
    is_required: bool = Field(default=False, description="Whether column is required")
    width: int | None = Field(default=None, description="Column width in pixels")
    metadata: dict[str, object] | None = Field(
        default=None,
        description="Additional metadata (e.g., dropdown options, validation rules)",
    )


class EventTimeFormatConfig(BaseModel):
    """Time display options for calendar events."""

    format: Literal["12h", "24h", "auto"] = Field(
        default="auto", description="Clock format for event time display"
    )
    show_minutes: bool = Field(
        default=True, description="Whether minutes are shown in event time"
    )
    show_meridiem: bool = Field(
        default=True, description="Show AM/PM indicator when format allows"
    )


class EventLoadingConfig(BaseModel):
    """FullCalendar event density controls."""

    day_max_events: int | bool = Field(
        default=True,
        description="Max number of events per day (true for auto 'more' link)",
    )
    day_max_event_rows: int | bool = Field(
        default=True,
        description="Max rows of events per day (true for auto)",
    )
    more_link_click: Literal[
        "popover", "week", "day", "timeGridWeek", "timeGridDay"
    ] = Field(
        default="popover",
        description="Behavior when clicking the +X more link",
    )


class EventDurationSettings(BaseModel):
    """Controls how individual reservation events are laid out in the calendar."""

    strategy: Literal["auto", "manual"] = Field(
        default="auto",
        description="Auto derives duration from slot duration & capacity; manual uses fixed durations.",
    )
    default_minutes: int = Field(
        default=DEFAULT_EVENT_DURATION_MINUTES,
        ge=MIN_EVENT_DURATION_MINUTES,
        le=MAX_EVENT_DURATION_MINUTES,
        description="Fallback duration (minutes) when no per-type override exists.",
    )
    per_type_minutes: dict[str, int] = Field(
        default_factory=dict,
        description="Optional mapping of reservation type -> duration in minutes.",
    )

    @field_validator("per_type_minutes", mode="before")
    @classmethod
    def validate_per_type_minutes(cls, value: object) -> dict[str, int]:
        if not value:
            return {}
        if not isinstance(value, dict):
            raise ValueError("per_type_minutes must be a mapping of type -> minutes")
        normalized: dict[str, int] = {}
        for key, raw in value.items():
            key_str = str(key)
            if key_str not in ALLOWED_EVENT_TYPE_IDS:
                continue
            try:
                minutes = int(raw)
            except (TypeError, ValueError):
                continue
            minutes = max(
                MIN_EVENT_DURATION_MINUTES, min(MAX_EVENT_DURATION_MINUTES, minutes)
            )
            normalized[key_str] = minutes
        return normalized


class SlotCapacityRoleConfig(BaseModel):
    """Capacity guardrails for a specific persona (agent, secretary, etc.)."""

    total_max: int = Field(
        default=DEFAULT_AGENT_SLOT_CAPACITY,
        ge=1,
        le=MAX_SLOT_CAPACITY_PER_TYPE,
        description="Maximum number of reservations of any type allowed per slot.",
    )
    per_type_max: dict[str, int] = Field(
        default_factory=dict,
        description="Optional mapping of reservation type -> max reservations per slot.",
    )

    @field_validator("per_type_max", mode="before")
    @classmethod
    def validate_per_type_max(cls, value: object) -> dict[str, int]:
        if not value:
            return {}
        if not isinstance(value, dict):
            raise ValueError("per_type_max must be a mapping of type -> capacity")
        normalized: dict[str, int] = {}
        for key, raw in value.items():
            key_str = str(key)
            if key_str not in ALLOWED_EVENT_TYPE_IDS:
                continue
            try:
                limit = int(raw)
            except (TypeError, ValueError):
                continue
            limit = max(0, min(MAX_SLOT_CAPACITY_PER_TYPE, limit))
            normalized[key_str] = limit
        return normalized


class SlotCapacityConfig(BaseModel):
    """Persona-based slot capacity controls."""

    agent: SlotCapacityRoleConfig = Field(
        default_factory=SlotCapacityRoleConfig,
        description="Capacity limits enforced for automated agent actions.",
    )
    secretary: SlotCapacityRoleConfig = Field(
        default_factory=lambda: SlotCapacityRoleConfig(
            total_max=DEFAULT_SECRETARY_SLOT_CAPACITY
        ),
        description="Capacity limits enforced for human/secretary actions.",
    )


class QuietHoursConfig(BaseModel):
    """Quiet hours window that suppresses notifications."""

    start: str | None = Field(
        default=None,
        description="Quiet hours start time in HH:MM (24h) format",
    )
    end: str | None = Field(
        default=None,
        description="Quiet hours end time in HH:MM (24h) format",
    )


class NotificationPreferencesConfig(BaseModel):
    """Channel and trigger preferences for notifications."""

    notify_on_event_create: bool = Field(
        default=True, description="Notify when events are created"
    )
    notify_on_event_update: bool = Field(
        default=True, description="Notify when events are updated"
    )
    notify_on_event_delete: bool = Field(
        default=True, description="Notify when events are deleted"
    )
    notify_on_event_reminder: bool = Field(
        default=False, description="Notify for upcoming event reminders"
    )
    notification_sound: bool = Field(
        default=False, description="Play a sound for notifications"
    )
    notification_desktop: bool = Field(
        default=False, description="Show desktop notifications"
    )
    quiet_hours: QuietHoursConfig | None = Field(
        default=None,
        description="Optional quiet hours window that suppresses notifications",
    )


class AppConfigBase(BaseModel):
    """Base configuration model."""

    working_days: list[int] = Field(
        default=[0, 1, 2, 3, 4, 6],
        description="Days of week that are working days (0=Sunday, 6=Saturday). Friday (5) excluded.",
    )
    default_working_hours: WorkingHoursConfig = Field(
        default_factory=lambda: WorkingHoursConfig(
            days_of_week=[0, 1, 2, 3, 4],
            start_time="11:00",
            end_time="17:00",
        ),
        description="Default working hours for days without specific overrides",
    )
    day_specific_hours: list[DaySpecificWorkingHours] = Field(
        default_factory=list,
        description="Day-specific working hours that override default hours for specific days",
    )
    slot_duration_hours: int = Field(
        default=2,
        ge=1,
        le=24,
        description="Default slot duration in hours",
    )
    day_specific_slot_durations: list[DaySpecificSlotDuration] = Field(
        default_factory=list,
        description="Day-specific slot durations that override default slot duration for specific days",
    )
    custom_calendar_ranges: list[CustomCalendarRangeConfig] = Field(
        default_factory=list,
        description="Custom calendar configurations for specific date ranges",
    )
    calendar_columns: list[ColumnConfig] = Field(
        default_factory=list,
        description="Column configuration for calendar/data table page",
    )
    documents_columns: list[ColumnConfig] = Field(
        default_factory=list,
        description="Column configuration for documents page",
    )
    default_country_prefix: str = Field(
        default="SA",
        description="Default country code for phone selector (ISO 3166-1 alpha-2)",
    )
    available_languages: list[str] = Field(
        default=["en", "ar"],
        description="Available language codes (from implemented languages)",
    )
    available_themes: list[str] = Field(
        default_factory=lambda: list(DEFAULT_AVAILABLE_THEMES),
        description="Available UI themes that users can pick from settings",
    )
    available_calendar_views: list[str] = Field(
        default_factory=lambda: list(DEFAULT_CALENDAR_VIEWS),
        description="FullCalendar view identifiers exposed to end users",
    )
    timezone: str = Field(
        default=DEFAULT_TIMEZONE,
        description="Default timezone (IANA identifier) used for reservations and calendars",
    )
    llm_provider: str = Field(
        default=DEFAULT_LLM_PROVIDER,
        description="LLM provider to use for AI features (openai, anthropic, gemini)",
    )
    calendar_first_day: int | None = Field(
        default=6,
        ge=0,
        le=6,
        description="First day of week in calendar views (0=Sunday ... 6=Saturday)",
    )
    event_colors: EventColorsConfig = Field(
        default_factory=EventColorsConfig,
        description="Color configuration for calendar event types",
    )
    event_time_format: EventTimeFormatConfig = Field(
        default_factory=EventTimeFormatConfig,
        description="Clock display format for calendar events",
    )
    default_calendar_view: str | None = Field(
        default="timeGridWeek", description="Initial FullCalendar view (e.g. timeGridWeek)"
    )
    calendar_locale: str | None = Field(
        default=None,
        description="Locale applied to FullCalendar (ISO code, e.g. 'en', 'ar-sa')",
    )
    calendar_direction: Literal["ltr", "rtl", "auto"] = Field(
        default="auto", description="Text direction override for the calendar"
    )
    event_loading: EventLoadingConfig = Field(
        default_factory=EventLoadingConfig,
        description="Controls for FullCalendar event density limits",
    )
    event_duration_settings: EventDurationSettings = Field(
        default_factory=EventDurationSettings,
        description="Controls how long events appear based on slot duration or manual overrides.",
    )
    slot_capacity_settings: SlotCapacityConfig = Field(
        default_factory=SlotCapacityConfig,
        description="Maximum reservations allowed per slot for each persona and event type.",
    )
    notification_preferences: NotificationPreferencesConfig = Field(
        default_factory=NotificationPreferencesConfig,
        description="Notification triggers and channel preferences",
    )

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError(f"Invalid timezone identifier: {value}") from exc
        return value

    @field_validator("llm_provider")
    @classmethod
    def validate_llm_provider(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in SUPPORTED_LLM_PROVIDERS:
            allowed = ", ".join(sorted(SUPPORTED_LLM_PROVIDERS))
            raise ValueError(f"llm_provider must be one of: {allowed}")
        return normalized


class AppConfigCreate(AppConfigBase):
    """Schema for creating app configuration."""

    pass


class AppConfigUpdate(BaseModel):
    """Schema for updating app configuration (all fields optional)."""

    working_days: list[int] | None = None
    default_working_hours: WorkingHoursConfig | None = None
    day_specific_hours: list[DaySpecificWorkingHours] | None = None
    slot_duration_hours: int | None = None
    day_specific_slot_durations: list[DaySpecificSlotDuration] | None = None
    custom_calendar_ranges: list[CustomCalendarRangeConfig] | None = None
    calendar_columns: list[ColumnConfig] | None = None
    documents_columns: list[ColumnConfig] | None = None
    default_country_prefix: str | None = None
    available_languages: list[str] | None = None
    available_themes: list[str] | None = None
    available_calendar_views: list[str] | None = None
    timezone: str | None = None
    llm_provider: str | None = None
    calendar_first_day: int | None = Field(default=None, ge=0, le=6)
    event_time_format: EventTimeFormatConfig | None = None
    default_calendar_view: str | None = None
    calendar_locale: str | None = None
    calendar_direction: Literal["ltr", "rtl", "auto"] | None = None
    event_colors: EventColorsConfig | None = None
    event_loading: EventLoadingConfig | None = None
    event_duration_settings: EventDurationSettings | None = None
    slot_capacity_settings: SlotCapacityConfig | None = None
    notification_preferences: NotificationPreferencesConfig | None = None


class AppConfigRead(AppConfigBase):
    """Schema for reading app configuration."""

    id: int = Field(description="Configuration ID")
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True

