import datetime
from typing import Dict, Any, Optional
from zoneinfo import ZoneInfo
from hijri_converter import convert
from ..shared.base_service import BaseService
from .reservation_repository import ReservationRepository
from app.utils import (
    format_response, get_time_slots, parse_date, 
    normalize_time_format, is_vacation_period, find_vacation_end_date,
    format_enhanced_vacation_message
)
from app.i18n import get_message
from app.config import config


class AvailabilityService(BaseService):
    """
    Service responsible for checking appointment availability.
    Handles time slot availability and appointment searching.
    """
    
    def __init__(self, reservation_repository: Optional[ReservationRepository] = None, **kwargs):
        """
        Initialize availability service with dependency injection.
        
        Args:
            reservation_repository: Repository for reservation data access
        """
        super().__init__(**kwargs)
        self.reservation_repository = reservation_repository or ReservationRepository(self.timezone)
    
    def get_service_name(self) -> str:
        return "AvailabilityService"
    
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
                    "end_date": vacation_end
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
                                "start_date": vacation_start,
                                "end_date": vacation_end,
                                "days_until": days_until_vacation
                            }
                    except (ValueError, TypeError) as e:
                        self.logger.error(f"Error processing vacation date {start_date_str}: {e}")
                        continue
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error checking vacation info: {e}")
            return None
    
    def get_available_time_slots(self, date_str: str, max_reservations: int = 5, hijri: bool = False) -> Dict[str, Any]:
        """
        Get available time slots for a given date.
        
        Args:
            date_str: Date string to check availability for
            max_reservations: Maximum reservations allowed per slot
            hijri: Whether input date is in Hijri format (for parsing only)
            
        Returns:
            Response with available time slots and both date formats
        """
        try:
            # Get current date/time in configured timezone
            datetime.datetime.now(tz=ZoneInfo(self.timezone))
            
            # Process date - convert from Hijri if needed
            try:
                parsed_date_str = parse_date(date_str, hijri=hijri)
            except Exception as e:
                return format_response(False, message=f"Invalid date format: {str(e)}")
            
            # Parse the date to get date object for Hijri conversion
            date_obj = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d")
            
            # Generate both Hijri and Gregorian dates for output
            gregorian_date_str = parsed_date_str
            hijri_date_obj = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
            hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"
            
            # Get all time slots for the date with filtering for past times if date is today
            all_slots = get_time_slots(date_str=parsed_date_str)
            
            # If get_time_slots returns an error, pass it through
            if isinstance(all_slots, dict) and "success" in all_slots and not all_slots["success"]:
                return all_slots
            
            # Create a mapping of 12-hour format to 24-hour format for database queries
            time_format_map = {
                slot: normalize_time_format(slot, to_24h=True) 
                for slot in all_slots.keys()
            }
            
            # Reverse mapping (24-hour to 12-hour) for results
            {v: k for k, v in time_format_map.items()}

            # Check current reservations for each time slot
            for slot_12h, slot_24h in time_format_map.items():
                try:
                    active_reservations = self.reservation_repository.find_active_by_slot(parsed_date_str, slot_24h)
                    all_slots[slot_12h] = len(active_reservations)
                except Exception as e:
                    self.logger.error(f"Error checking slot {slot_24h} on {parsed_date_str}: {e}")
                    continue
            
            # Return only slots with availability (in 12-hour format for display)
            available_slots = [ts for ts, count in all_slots.items() if count < max_reservations]
            if not available_slots:
                return format_response(False, message=get_message("all_slots_fully_booked"))
            
            # Return response with both date formats and available slots
            result_data = {
                "gregorian_date": gregorian_date_str,
                "hijri_date": hijri_date_str,
                "time_slots": available_slots
            }
            
            return format_response(True, data=result_data)
            
        except Exception as e:
            return self._handle_error("get_available_time_slots", e)
    
    def search_available_appointments(self, start_date: Optional[str] = None, time_slot: Optional[str] = None, 
                                    days_forward: int = 3, days_backward: int = 0, 
                                    max_reservations: int = 5, hijri: bool = False) -> Dict[str, Any]:
        """
        Search for available appointment slots across a range of dates.
        
        Args:
            start_date: Starting date for search
            time_slot: Specific time slot to search for
            days_forward: Number of days to search forward
            days_backward: Number of days to search backward
            max_reservations: Maximum reservations per slot
            hijri: Whether the input start_date is in Hijri format (for parsing only)
            
        Returns:
            List of available appointments with both Hijri and Gregorian dates
        """
        try:
            # Initialize variables for time slot comparison
            requested_time = None
            requested_minutes = None
            
            # Parse the requested time slot if provided
            if time_slot is not None:
                parsed_time_str = normalize_time_format(time_slot, to_24h=True)
                requested_time = datetime.datetime.strptime(parsed_time_str, "%H:%M")
                requested_minutes = requested_time.hour * 60 + requested_time.minute
            
            available_dates = []
            date_slots_map = {}  # For grouping slots by date when no time_slot is provided
            
            # Get current date/time in timezone
            today = datetime.datetime.now(tz=ZoneInfo(self.timezone))
            
            # Use provided start_date if available, otherwise use today
            if start_date:
                if isinstance(start_date, str):
                    try:
                        # Use parse_date which handles both Gregorian and Hijri dates
                        parsed_date_str = parse_date(start_date, hijri=hijri)
                        start_date = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").date()
                    except Exception as e:
                        self.logger.error(f"Error parsing start date: {e}")
                        # Fall back to today if parsing fails
                        start_date = today.date()
                elif isinstance(start_date, datetime.date):
                    # Already a date object, no conversion needed
                    pass
                else:
                    raise ValueError("start_date must be a string (YYYY-MM-DD) or datetime.date object")
                
                # Create a datetime object at the start of the day in TIMEZONE
                today = datetime.datetime.combine(start_date, datetime.time.min).replace(tzinfo=ZoneInfo(self.timezone))
            else:
                # No start_date provided, check if today is in vacation and adjust accordingly
                today_date = today.date()
                is_vacation_today, _ = is_vacation_period(today_date)
                
                if is_vacation_today:
                    # Find the end of the current vacation period
                    vacation_end_date = find_vacation_end_date(today_date)
                    if vacation_end_date:
                        # Start searching from the day after vacation ends
                        start_date = vacation_end_date + datetime.timedelta(days=1)
                        today = datetime.datetime.combine(start_date, datetime.time.min).replace(tzinfo=ZoneInfo(self.timezone))
                        
            now = today.date()
            
            # Include today in the search
            date_range = list(range(-days_backward, days_forward + 1))
            
            for day_offset in date_range:
                date_obj = today + datetime.timedelta(days=day_offset)
                gregorian_date_str = date_obj.strftime("%Y-%m-%d")
                date_day = date_obj.date()
                
                # Skip dates in the past
                if date_day < now:
                    continue
                    
                # Skip dates during vacation
                is_vacation, _ = is_vacation_period(date_day)
                if is_vacation:
                    continue
                
                # Always generate both Hijri and Gregorian dates for output
                hijri_date_obj = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
                hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"
                
                # If no specific time slot is requested, get all available time slots for this date
                if time_slot is None:
                    result = self.get_available_time_slots(gregorian_date_str, max_reservations, hijri=False)
                    # Skip if error response
                    if isinstance(result, dict) and result.get("success") is False:
                        continue
                    
                    # Extract data from the new response format
                    if isinstance(result, dict) and "data" in result:
                        slot_data = result.get("data") or {}
                        if isinstance(slot_data, dict) and "time_slots" in slot_data:
                            available_slots = slot_data.get("time_slots") or []
                            # Use the date formats from the response
                            response_gregorian = slot_data.get("gregorian_date", gregorian_date_str)
                            response_hijri = slot_data.get("hijri_date", hijri_date_str)
                        else:
                            # Fallback for backward compatibility
                            available_slots = slot_data if isinstance(slot_data, list) else []
                            response_gregorian = gregorian_date_str
                            response_hijri = hijri_date_str
                    else:
                        available_slots = result or []
                        response_gregorian = gregorian_date_str
                        response_hijri = hijri_date_str
                    
                    if not available_slots:
                        continue

                    # Create date key that includes both formats
                    date_key = f"{response_gregorian}|{response_hijri}"
                    if date_key not in date_slots_map:
                        date_slots_map[date_key] = {
                            "gregorian_date": response_gregorian,
                            "hijri_date": response_hijri,
                            "time_slots": []
                        }

                    # Add each available slot for this date
                    for slot in available_slots:
                        # Always store 24-hour format internally, but display in 12-hour format
                        slot_24h = normalize_time_format(slot, to_24h=True)
                        slot_12h = normalize_time_format(slot_24h, to_24h=False)
                        
                        date_slots_map[date_key]["time_slots"].append({
                            "time_slot": slot_12h,
                        })
                    
                    continue  # Move to the next date
                
                # For specific time slot requests, continue with the existing logic
                # Get all slots for this date with past filtering for today
                all_slots = get_time_slots(date_str=gregorian_date_str)
                
                # Skip if get_time_slots returned an error (vacation or parsing)
                if isinstance(all_slots, dict) and all_slots.get("success") is False:
                    continue
                # Skip if get_time_slots returns an empty/non-dict result
                if not isinstance(all_slots, dict) or not all_slots:
                    continue
                    
                # Parse all available slots and convert to 24-hour format
                parsed_slots = []
                for slot in all_slots.keys():
                    try:
                        # Convert to 24-hour format for comparison
                        slot_24h = normalize_time_format(slot, to_24h=True)
                        slot_time = datetime.datetime.strptime(slot_24h, "%H:%M")
                        parsed_slots.append((slot, slot_time))
                    except ValueError:
                        continue  # Skip invalid slots
                
                if not parsed_slots:
                    continue
                
                # Find the closest slot based on time difference in minutes
                closest_slot, closest_time = min(
                    parsed_slots,
                    key=lambda x: abs((x[1].hour * 60 + x[1].minute) - requested_minutes)
                )
                
                # Determine if this is an exact match (using 24-hour format for comparison)
                is_exact = (closest_time.hour == requested_time.hour and 
                           closest_time.minute == requested_time.minute)
                
                # Get 24-hour format of the closest slot for database query
                closest_slot_24h = normalize_time_format(closest_slot, to_24h=True)
                # Ensure 12-hour format for display
                closest_slot_12h = normalize_time_format(closest_slot_24h, to_24h=False)
                
                try:
                    # Check reservation count for the closest slot
                    active_reservations = self.reservation_repository.find_active_by_slot(gregorian_date_str, closest_slot_24h)
                    count = len(active_reservations)
                    
                    # Add date if the slot has availability
                    if count < max_reservations:
                        date_entry = {
                            "gregorian_date": gregorian_date_str,
                            "hijri_date": hijri_date_str,
                            "time_slot": closest_slot_12h,  # Use 12-hour format for display
                            "is_exact": is_exact
                        }
                        
                        available_dates.append(date_entry)
                except Exception as e:
                    # Log and continue on database errors for individual slots
                    self.logger.error(f"Database error while checking slot {closest_slot_24h} on {gregorian_date_str}: {e}")
                    continue
            
            # If no time_slot was provided, convert the grouped map to a list
            if time_slot is None and date_slots_map:
                for date_info in date_slots_map.values():
                    available_dates.append(date_info)
            
            # Prepare response data
            response_data = {"appointments": available_dates}
            
            # Check for vacation information and add to response
            vacation_info = self._get_upcoming_vacation_info(now)
            if vacation_info:
                response_data["vacation_info"] = vacation_info
                
                # Add specific vacation dates in both formats
                if vacation_info["status"] == "current":
                    if vacation_info.get("end_date"):
                        end_date = vacation_info["end_date"]
                        end_hijri = convert.Gregorian(end_date.year, end_date.month, end_date.day).to_hijri()
                        response_data["vacation_end_gregorian"] = end_date.strftime("%Y-%m-%d")
                        response_data["vacation_end_hijri"] = f"{end_hijri.year}-{end_hijri.month:02d}-{end_hijri.day:02d}"
                
                elif vacation_info["status"] == "upcoming":
                    start_date = vacation_info["start_date"]
                    end_date = vacation_info["end_date"]
                    
                    start_hijri = convert.Gregorian(start_date.year, start_date.month, start_date.day).to_hijri()
                    end_hijri = convert.Gregorian(end_date.year, end_date.month, end_date.day).to_hijri()
                    
                    response_data["vacation_start_gregorian"] = start_date.strftime("%Y-%m-%d")
                    response_data["vacation_start_hijri"] = f"{start_hijri.year}-{start_hijri.month:02d}-{start_hijri.day:02d}"
                    response_data["vacation_end_gregorian"] = end_date.strftime("%Y-%m-%d")
                    response_data["vacation_end_hijri"] = f"{end_hijri.year}-{end_hijri.month:02d}-{end_hijri.day:02d}"
            
            return format_response(True, data=response_data)
        
        except ValueError as ve:
            # Invalid input format error
            return format_response(False, message=get_message("invalid_date_format", error=str(ve)))
        except Exception as e:
            return self._handle_error("search_available_appointments", e)