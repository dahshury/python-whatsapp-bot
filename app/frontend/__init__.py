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
    
# Helper function to compute Ramadan dates for a given Gregorian year.
def get_ramadan_dates(year):
    # Convert January 1 of the year to Hijri to get an approximate Hijri year.
    hijri_year = Gregorian(year, 1, 1).to_hijri().year
    # Compute the Gregorian date for the 1st day of Ramadan of that Hijri year.
    ramadan_start = Hijri(hijri_year, 9, 1).to_gregorian()
    # Ramadan lasts 29 or 30 days. We'll assume 30 days.
    ramadan_end = ramadan_start + datetime.timedelta(days=30)
    return ramadan_start, ramadan_end

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
    date_obj = datetime.datetime.combine(date_obj, datetime.time.min).replace(tzinfo=ZoneInfo("Asia/Riyadh"))
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
    