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
    """
    Loads the users.yaml file, updates user passwords using environment variables, 
    and saves the updated YAML back to disk.
    """
    # Load environment variables from .env file
    load_dotenv()

    # Determine the path to the YAML file
    if yaml_path is None:
        yaml_path = os.path.join(os.path.dirname(__file__), "../../users.yaml")

    # Load the YAML file
    with open(yaml_path, "r") as file:
        config = yaml.safe_load(file)

    # Iterate through users in the YAML and update passwords if env var exists
    if "credentials" in config and "usernames" in config["credentials"]:
        for user, data in config["credentials"]["usernames"].items():
            env_var_name = f"{user}_password"
            new_password = os.getenv(env_var_name)  # Get password from env
            if new_password:  # Only update if env var is set
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

    with open('./users.yaml') as file:
        config = yaml.load(file, Loader=SafeLoader)
        authenticator = stauth.Authenticate(
            config['credentials'],
            config['cookie']['name'],
            config['cookie']['key'],
            config['cookie']['expiry_days']
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
