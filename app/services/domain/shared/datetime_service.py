import datetime
from typing import Dict, Any, Optional
from zoneinfo import ZoneInfo
from hijri_converter import convert
from .base_service import BaseService
from app.utils import format_response, is_vacation_period, find_vacation_end_date, format_enhanced_vacation_message
from app.config import config


class DateTimeService(BaseService):
    """
    Service responsible for date and time operations.
    Handles both Gregorian and Hijri calendar systems.
    """
    
    def get_service_name(self) -> str:
        return "DateTimeService"
    
    def _get_upcoming_vacation_info(self, current_date: datetime.date) -> Optional[Dict[str, Any]]:
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
                    "end_date": vacation_end.strftime("%Y-%m-%d") if vacation_end else None
                }
            
            # Check for vacations approaching within 1 month
            vacation_start_dates = config.get("VACATION_START_DATES", "")
            vacation_durations = config.get("VACATION_DURATIONS", "")
            
            if vacation_start_dates and vacation_durations:
                start_dates = [d.strip() for d in vacation_start_dates.split(',') if d.strip()]
                durations = [int(d.strip()) for d in vacation_durations.split(',') if d.strip()]
                
                for start_date_str, duration in zip(start_dates, durations):
                    try:
                        vacation_start = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
                        vacation_end = vacation_start + datetime.timedelta(days=duration-1)
                        
                        # Check if vacation starts within the next 30 days
                        days_until_vacation = (vacation_start - current_date).days
                        if 0 < days_until_vacation <= 30:
                            # Create vacation message for upcoming vacation
                            start_dt = datetime.datetime.combine(vacation_start, datetime.time.min).replace(tzinfo=ZoneInfo(self.timezone))
                            end_dt = datetime.datetime.combine(vacation_end, datetime.time.min).replace(tzinfo=ZoneInfo(self.timezone))
                            base_message = config.get('VACATION_MESSAGE', 'The business will be closed during this period.')
                            vacation_message = format_enhanced_vacation_message(start_dt, end_dt, base_message)
                            
                            return {
                                "status": "upcoming",
                                "message": vacation_message,
                                "start_date": vacation_start.strftime("%Y-%m-%d"),
                                "end_date": vacation_end.strftime("%Y-%m-%d"),
                                "days_until": days_until_vacation
                            }
                    except (ValueError, TypeError) as e:
                        self.logger.error(f"Error processing vacation date {start_date_str}: {e}")
                        continue
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error checking vacation info: {e}")
            return None
    
    def get_current_datetime(self) -> Dict[str, Any]:
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
            hijri_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
            
            day_name = now.strftime("%a")
            is_ramadan = hijri_date.month == 9
            
            data = {
                "gregorian_date": gregorian_date_str,
                "makkah_time": time_str,
                "hijri_date": hijri_date_str,
                "day_name": day_name,
                "is_ramadan": is_ramadan
            }
            
            # Check for vacation information
            vacation_info = self._get_upcoming_vacation_info(now.date())
            if vacation_info:
                data["vacation_info"] = vacation_info
                
                # Add specific vacation dates in both formats
                if vacation_info["status"] == "current":
                    if vacation_info.get("end_date"):
                        end_date_str = vacation_info["end_date"]
                        end_date = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()
                        end_hijri = convert.Gregorian(end_date.year, end_date.month, end_date.day).to_hijri()
                        data["vacation_end_gregorian"] = end_date_str
                        data["vacation_end_hijri"] = f"{end_hijri.year}-{end_hijri.month:02d}-{end_hijri.day:02d}"
                
                elif vacation_info["status"] == "upcoming":
                    start_date_str = vacation_info["start_date"]
                    end_date_str = vacation_info["end_date"]
                    
                    start_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
                    end_date = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()
                    
                    start_hijri = convert.Gregorian(start_date.year, start_date.month, start_date.day).to_hijri()
                    end_hijri = convert.Gregorian(end_date.year, end_date.month, end_date.day).to_hijri()
                    
                    data["vacation_start_gregorian"] = start_date_str
                    data["vacation_start_hijri"] = f"{start_hijri.year}-{start_hijri.month:02d}-{start_hijri.day:02d}"
                    data["vacation_end_gregorian"] = end_date_str
                    data["vacation_end_hijri"] = f"{end_hijri.year}-{end_hijri.month:02d}-{end_hijri.day:02d}"
            
            return format_response(True, data=data)
            
        except Exception as e:
            return self._handle_error("get_current_datetime", e) 