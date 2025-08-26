import datetime
import os
import time
from zoneinfo import ZoneInfo

import streamlit as st
import streamlit.components.v1 as components
import streamlit_authenticator as stauth
import yaml
from dotenv import load_dotenv
from hijri_converter import Gregorian, Hijri, convert
from yaml.loader import SafeLoader

def bootstrap_hijri_datepicker(default_date="", height=400, key=None):
    _component_func = components.declare_component(
    name="bootstrap_hijri_datepicker",
    path=os.path.join(os.path.dirname(__file__), 'datepicker')
    )
    date_value = _component_func(
        defaultDate=default_date,
        height=height,
        width=100,
        key=key,
    )
    return date_value

def prayer_times_widget(default_date="", height=400, key=None):
    _component_func = components.declare_component(
    name="prayer_widget",
    path=os.path.join(os.path.dirname(__file__), "tawkit")
    )
    clock = _component_func(
        defaultDate=default_date,
        height=height,
        width=100,
        key=key,
    )
    return clock

# Embed HTML using path
def load_html(html_file_path):
    if os.path.exists(html_file_path):
        with open(html_file_path, "r", encoding="utf-8") as html_file:
            return html_file.read()
    else:
        return None
    
def reset_data_editor(success=True):
    time.sleep(3 if success else 5)
    st.session_state._changes_processed = False
    st.session_state.data_editor_key += 1  # bump data_editor_key to clear widget state
    st.session_state.pop('prev_settings', None)
    st.session_state.pop('calendar_events_hash', None)
    st.rerun()  # Full rerun to update calendar

def convert_to_hijri(date_str):
    """Convert Gregorian date string to Hijri date string."""
    return Gregorian(*map(int, date_str.split('-'))).to_hijri().isoformat()

def reset_calendar(success, new_start_date):
    time.sleep(3 if success else 5)
    st.session_state.selected_start_time = str(new_start_date)
    st.session_state.selected_event_id = None
    st.session_state.selected_end_time = None
    # Force a rebuild of calendar events on the next render
    st.session_state.pop('calendar_events_hash', None)
    st.rerun()

def update_date_time_selection(date_str=None, time_str=None, is_range=False, is_end=False):
    """
    Consistently update session state for date and time selection.
    
    Args:
        date_str: Date string in ISO format (YYYY-MM-DD) or with time (YYYY-MM-DDThh:mm)
        time_str: Optional time string (HH:MM). If None, will try to extract from date_str
        is_range: Whether this is part of a date range selection
        is_end: Whether this is the end date of a range
    """
    # If date_str contains time information (YYYY-MM-DDThh:mm)
    if date_str and "T" in date_str:
        parts = date_str.split("T")
        date_part = parts[0]
        # Only override time_str if not provided
        if time_str is None and len(parts) > 1:
            time_str = parts[1][:5]  # Get HH:MM part
    else:
        date_part = date_str
    
    # Update session state based on start/end position
    if is_end:
        st.session_state.selected_end_date = date_part
        if time_str:
            st.session_state.selected_end_time = time_str
    else:
        st.session_state.selected_start_date = date_part
        if time_str:
            st.session_state.selected_start_time = time_str
            
        # If not part of a range, clear any end date/time
        if not is_range:
            st.session_state.selected_end_date = None
            st.session_state.selected_end_time = None

def format_date_for_display(date_str, is_gregorian=True):
    """
    Format a date string for display based on language preference.
    Returns both Gregorian and Hijri formatted dates.
    
    Args:
        date_str: Date string in YYYY-MM-DD format
        is_gregorian: Whether to format primarily for Gregorian display
        
    Returns:
        tuple: (primary_date, secondary_date) based on is_gregorian preference
    """
    if not date_str:
        return "", ""
        
    gregorian_date = date_str
    try:
        hijri_date = Gregorian(*map(int, date_str.split('-'))).to_hijri().isoformat()
    except (ValueError, TypeError, AttributeError):
        hijri_date = ""
    
    if is_gregorian:
        return gregorian_date, hijri_date
    else:
        return hijri_date, gregorian_date

def get_event_time_range(start_time, duration_delta):
    """
    Calculate end time from start time and duration delta.
    
    Args:
        start_time: Start time string in HH:MM format
        duration_delta: datetime.timedelta object
        
    Returns:
        tuple: (start_time, end_time, start_time_obj, end_time_obj)
    """
    if not start_time:
        return None, None, None, None
    
    try:
        start_time_obj = datetime.datetime.strptime(start_time, "%H:%M").time()
        end_time_obj = (datetime.datetime.combine(datetime.date.today(), start_time_obj) + duration_delta).time()
        end_time = end_time_obj.strftime("%H:%M")
        return start_time, end_time, start_time_obj, end_time_obj
    except (ValueError, TypeError, AttributeError):
        return start_time, None, None, None

def filter_events_by_date_time(events, date_filter, start_time_obj=None, end_time_obj=None, exclude_conversations=True, is_gregorian=True):
    """
    Filter events based on date and time criteria.
    
    Args:
        events: List of calendar events
        date_filter: Single date or (start_date, end_date) tuple
        start_time_obj: Optional start time object for filtering
        end_time_obj: Optional end time object for filtering
        exclude_conversations: Whether to exclude conversation events
        is_gregorian: Language preference flag
    
    Returns:
        list: Filtered events matching criteria
    """
    if not events:
        return []
        
    # Handle single date vs date range
    if isinstance(date_filter, tuple):
        start_date, end_date = date_filter
    else:
        start_date = date_filter
        end_date = None
    
    # Build base filter
    filtered = []
    
    for e in events:
        event_date = e.get("start", "").split("T")[0]
        
        # Skip if date doesn't match
        if end_date:
            if not (start_date <= event_date <= end_date):
                continue
        else:
            if event_date != start_date:
                continue
                
        # Skip conversations if needed
        if exclude_conversations:
            title = e.get('title', "")
            if not is_gregorian and "محادثة" in title:
                continue
            if is_gregorian and "Conversation" in title:
                continue
                
        # Apply time filter if provided
        if start_time_obj and end_time_obj:
            try:
                # Check if the event has a time component (contains 'T')
                start_str = e.get("start", "")
                if "T" in start_str and len(start_str.split("T")) > 1:
                    event_time = datetime.datetime.strptime(start_str.split("T")[1][:5], "%H:%M").time()
                    if not (start_time_obj <= event_time < end_time_obj):
                        continue
                else:
                    # For events without time (like vacation periods), skip time filtering
                    # These are typically full-day events and should be included regardless of time filter
                    pass
            except (ValueError, TypeError, AttributeError, KeyError, IndexError):
                continue
                
        filtered.append(e)
    
    return filtered
    
def update_passwords(yaml_path=None):
    # Load environment variables from .env file
    load_dotenv()
    # Determine the path to the users.yaml at project root
    if yaml_path is None:
        yaml_path = os.path.join(os.getcwd(), "users.yaml")
    # Skip if the file doesn't exist
    if not os.path.isfile(yaml_path):
        return
    # Load the YAML file
    with open(yaml_path, "r") as file:
        config = yaml.safe_load(file)
    # Skip if config is invalid
    if not isinstance(config, dict):
        return
    # Iterate through users in the YAML and update passwords if env var exists
    if "credentials" in config and "usernames" in config["credentials"]:
        for user, data in config["credentials"]["usernames"].items():
            env_var_name = f"{user}_password"
            new_password = os.getenv(env_var_name)
            if new_password:
                config["credentials"]["usernames"][user]["password"] = new_password
    # Save the updated YAML file
    with open(yaml_path, "w") as file:
        yaml.safe_dump(config, file, default_flow_style=False)
        
def subtract_ramadan_from_normal(normal_rules, ramadan_rules):
    """
    Adjusts normal business hours by removing Ramadan periods.
    Returns a new list of normal business rules with gaps during Ramadan.
    """
    adjusted_normal_rules = []

    for rule in normal_rules:
        start_recur = datetime.date.fromisoformat(rule["startRecur"])
        end_recur = datetime.date.fromisoformat(rule["endRecur"])
        remaining_periods = [(start_recur, end_recur)]  # Initialize with the full range

        for ramadan in ramadan_rules:
            ramadan_start = datetime.date.fromisoformat(ramadan["startRecur"])
            ramadan_end = datetime.date.fromisoformat(ramadan["endRecur"])

            new_periods = []
            for period_start, period_end in remaining_periods:
                # If Ramadan starts after the period ends or ends before it starts, keep it as is
                if ramadan_end <= period_start or ramadan_start >= period_end:
                    new_periods.append((period_start, period_end))
                else:
                    # Split into two parts if Ramadan is in the middle
                    if period_start < ramadan_start:
                        new_periods.append((period_start, ramadan_start))
                    if period_end > ramadan_end:
                        new_periods.append((ramadan_end, period_end))
            
            remaining_periods = new_periods  # Update with refined periods

        # Convert remaining valid periods back into normal rules
        for period_start, period_end in remaining_periods:
            adjusted_normal_rules.append({
                "daysOfWeek": rule["daysOfWeek"],
                "startTime": rule["startTime"],
                "endTime": rule["endTime"],
                "startRecur": period_start.isoformat(),
                "endRecur": period_end.isoformat(),
            })

    return adjusted_normal_rules
            
@st.fragment
def authenticate():
    update_passwords()
    # Load authentication configuration from project-root users.yaml
    config_path = os.path.join(os.getcwd(), "users.yaml")
    if not os.path.isfile(config_path):
        st.error(f"users.yaml not found at {config_path}")
        st.stop()
    with open(config_path, "r") as file:
        config = yaml.load(file, Loader=SafeLoader)
    # Validate config structure
    if not isinstance(config, dict) or "credentials" not in config or "cookie" not in config:
        st.error("Authentication configuration missing or invalid.")
        st.stop()
    authenticator = stauth.Authenticate(
        config["credentials"],
        config["cookie"]["name"],
        config["cookie"]["key"],
        config["cookie"]["expiry_days"]
    )
    return authenticator

def is_ramadan(gregorian_date):
    # If gregorian_date is a date object, use it directly
    if isinstance(gregorian_date, datetime.date):
        date_obj = gregorian_date
    else:
        # Otherwise, assume it's a string in the expected format
        date_obj = datetime.datetime.strptime(gregorian_date, "%Y-%m-%d").date()
    
    # Apply the timezone to the date by combining with a minimal time
    date_obj = datetime.datetime.combine(date_obj, datetime.time.min).replace(tzinfo=ZoneInfo(os.getenv("TIMEZONE", "Asia/Riyadh")))
    hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
    return hijri_date.month == 9

def convert_time_to_sortable(time_str):
    """
    Converts time strings in various formats to a sortable format.
    Handles 24-hour format (HH:MM:SS or HH:MM) or 12-hour format (HH:MM AM/PM).
    Ensures seconds are properly included for accurate sorting of conversation timestamps.
    
    Parameters:
        time_str (str): Time string in various formats
        
    Returns:
        str: Normalized 24-hour time format for sorting (HH:MM:SS)
    """
    if not time_str:
        return "00:00:00"  # Default for empty time strings
    
    try:
        # Handle 12-hour format (e.g., "01:30 PM", "1:30 PM", etc.)
        if "AM" in time_str.upper() or "PM" in time_str.upper():
            # Parse 12-hour format with AM/PM
            # Try different formats that might be encountered
            try:
                # First try with seconds
                time_obj = datetime.datetime.strptime(time_str, "%I:%M:%S %p")
            except ValueError:
                try:
                    # Try without seconds
                    time_obj = datetime.datetime.strptime(time_str, "%I:%M %p")
                except ValueError:
                    # If all else fails, extract and convert manually
                    parts = time_str.upper().replace("AM", " AM").replace("PM", " PM").split()
                    if len(parts) != 2:
                        return "00:00:00"  # Default for invalid format
                    
                    time_part = parts[0]
                    am_pm = parts[1]
                    
                    # Split hours, minutes, and possibly seconds
                    time_components = time_part.split(":")
                    
                    if len(time_components) >= 2:
                        hour, minute = map(int, time_components[:2])
                        second = int(time_components[2]) if len(time_components) > 2 else 0
                    else:
                        hour = int(time_part)
                        minute = 0
                        second = 0
                    
                    # Adjust for PM
                    if am_pm == "PM" and hour < 12:
                        hour += 12
                    elif am_pm == "AM" and hour == 12:
                        hour = 0
                    
                    return f"{hour:02d}:{minute:02d}:{second:02d}"
            
            # Convert to 24-hour format string with seconds
            return time_obj.strftime("%H:%M:%S")
        
        # Handle 24-hour format without seconds (HH:MM)
        elif len(time_str.split(":")) == 2:
            return f"{time_str}:00"
        
        # Handle 24-hour format with seconds (HH:MM:SS)
        elif len(time_str.split(":")) == 3:
            return time_str
        
        # Try to parse as a simple hour
        elif time_str.isdigit():
            hour = int(time_str)
            if 0 <= hour <= 23:
                return f"{hour:02d}:00:00"
        
        # If none of the above formats match, return default
        return "00:00:00"
    
    except Exception:
        # Return default time for any parsing errors
        return "00:00:00"
    
def get_ramadan_dates(year):
    # Convert January 1 of the year to Hijri to get an approximate Hijri year.
    hijri_year = Gregorian(year, 1, 1).to_hijri().year
    # Compute the Gregorian date for the 1st day of Ramadan of that Hijri year.
    ramadan_start = Hijri(hijri_year, 9, 1).to_gregorian()
    # Ramadan lasts 29 or 30 days. We'll assume 30 days.
    ramadan_end = ramadan_start + datetime.timedelta(days=30)
    return ramadan_start, ramadan_end
    