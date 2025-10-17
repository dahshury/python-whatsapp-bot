import datetime
from typing import Any
from zoneinfo import ZoneInfo

from hijri_converter import convert

from app.config import config
from app.utils import (
    find_vacation_end_date,
    format_enhanced_vacation_message,
    format_response,
    is_vacation_period,
)

from .base_service import BaseService


class DateTimeService(BaseService):
    """
    Service responsible for date and time operations.
    Handles both Gregorian and Hijri calendar systems.
    """

    def get_service_name(self) -> str:
        return "DateTimeService"

    def _get_upcoming_vacation_info(
        self, current_date: datetime.date
    ) -> dict[str, Any] | None:
        """
        Check for vacations approaching within 1 month or currently active.

        Args:
            current_date: The current date to check from

        Returns:
            Dictionary with vacation info if applicable, None otherwise
        """
        try:
            # Check if currently in vacation
            is_vacation_now, vacation_message = is_vacation_period(current_date)
            if is_vacation_now:
                vacation_end = find_vacation_end_date(current_date)
                return {
                    "status": "current",
                    "message": vacation_message,
                    "end_date": vacation_end.strftime("%Y-%m-%d")
                    if vacation_end
                    else None,
                }

            # Check DB vacations within 1 month
            try:
                from app.db import VacationPeriodModel, get_session

                with get_session() as session:
                    rows = session.query(VacationPeriodModel).all()
                    for r in rows:
                        try:
                            s_date = (
                                r.start_date
                                if isinstance(r.start_date, datetime.date)
                                else datetime.datetime.strptime(
                                    str(r.start_date), "%Y-%m-%d"
                                ).date()
                            )
                            if getattr(r, "end_date", None):
                                e_date = (
                                    r.end_date
                                    if isinstance(r.end_date, datetime.date)
                                    else datetime.datetime.strptime(
                                        str(r.end_date), "%Y-%m-%d"
                                    ).date()
                                )
                            else:
                                dur = max(1, int(getattr(r, "duration_days", 1)))
                                e_date = s_date + datetime.timedelta(days=dur - 1)
                            days_until = (s_date - current_date).days
                            if 0 < days_until <= 30:
                                start_dt = datetime.datetime.combine(
                                    s_date, datetime.time.min
                                ).replace(tzinfo=ZoneInfo(self.timezone))
                                end_dt = datetime.datetime.combine(
                                    e_date, datetime.time.min
                                ).replace(tzinfo=ZoneInfo(self.timezone))
                                base_message = config.get(
                                    "VACATION_MESSAGE",
                                    "The business will be closed during this period.",
                                )
                                vacation_message = format_enhanced_vacation_message(
                                    start_dt, end_dt, base_message
                                )
                                return {
                                    "status": "upcoming",
                                    "message": vacation_message,
                                    "start_date": s_date.strftime("%Y-%m-%d"),
                                    "end_date": e_date.strftime("%Y-%m-%d"),
                                    "days_until": days_until,
                                }
                        except Exception:
                            continue
            except Exception:
                pass

            return None

        except Exception as e:
            self.logger.error(f"Error checking vacation info: {e}")
            return None

    def get_current_datetime(self) -> dict[str, Any]:
        """
        Get the current date and time in both Hijri and Gregorian calendars.
        Includes vacation information when applicable.

        Returns:
            dict: A dictionary containing current datetime information in both calendars
        """
        try:
            now = datetime.datetime.now(tz=ZoneInfo(self.timezone))
            gregorian_date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M %p")

            hijri_date = convert.Gregorian(now.year, now.month, now.day).to_hijri()
            hijri_date_str = (
                f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
            )

            day_name = now.strftime("%a")
            is_ramadan = hijri_date.month == 9

            data = {
                "gregorian_date": gregorian_date_str,
                "makkah_time": time_str,
                "hijri_date": hijri_date_str,
                "day_name": day_name,
                "is_ramadan": is_ramadan,
            }

            # Check for vacation information
            vacation_info = self._get_upcoming_vacation_info(now.date())
            if vacation_info:
                data["vacation_info"] = vacation_info

                # Add specific vacation dates in both formats
                if vacation_info["status"] == "current":
                    if vacation_info.get("end_date"):
                        end_date_str = vacation_info["end_date"]
                        end_date = datetime.datetime.strptime(
                            end_date_str, "%Y-%m-%d"
                        ).date()
                        end_hijri = convert.Gregorian(
                            end_date.year, end_date.month, end_date.day
                        ).to_hijri()
                        data["vacation_end_gregorian"] = end_date_str
                        data["vacation_end_hijri"] = (
                            f"{end_hijri.year}-{end_hijri.month:02d}-{end_hijri.day:02d}"
                        )

                elif vacation_info["status"] == "upcoming":
                    start_date_str = vacation_info["start_date"]
                    end_date_str = vacation_info["end_date"]

                    start_date = datetime.datetime.strptime(
                        start_date_str, "%Y-%m-%d"
                    ).date()
                    end_date = datetime.datetime.strptime(
                        end_date_str, "%Y-%m-%d"
                    ).date()

                    start_hijri = convert.Gregorian(
                        start_date.year, start_date.month, start_date.day
                    ).to_hijri()
                    end_hijri = convert.Gregorian(
                        end_date.year, end_date.month, end_date.day
                    ).to_hijri()

                    data["vacation_start_gregorian"] = start_date_str
                    data["vacation_start_hijri"] = (
                        f"{start_hijri.year}-{start_hijri.month:02d}-{start_hijri.day:02d}"
                    )
                    data["vacation_end_gregorian"] = end_date_str
                    data["vacation_end_hijri"] = (
                        f"{end_hijri.year}-{end_hijri.month:02d}-{end_hijri.day:02d}"
                    )

            return format_response(True, data=data)

        except Exception as e:
            return self._handle_error("get_current_datetime", e)
