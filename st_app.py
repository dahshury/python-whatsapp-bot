import base64
import datetime
import hashlib
import json
import time

import pandas as pd
import streamlit as st
import streamlit_antd_components as sac
from hijri_converter import Gregorian
from streamlit_calendar import calendar
from streamlit_autorefresh import st_autorefresh

from app.frontend import (authenticate,
                          get_ramadan_dates, is_ramadan,
                          subtract_ramadan_from_normal)
from app.utils import send_whatsapp_message, append_message
from app.services.assistant_functions import (cancel_reservation,
                                            modify_id,
                                              modify_reservation, parse_date,
                                              parse_time, reserve_time_slot,
                                              )
from app.utils import get_all_reservations, get_all_conversations
# =============================================================================
# PAGE CONFIGURATION
# =============================================================================
st.set_page_config(page_title="Dr. Amal Calendar", page_icon=":calendar:", layout="wide", initial_sidebar_state='expanded')

# =============================================================================
# AUTHENTICATION
# =============================================================================
authenticator = authenticate()
try:
    authenticator.login()
except Exception as e:
    st.error(e)

if not st.session_state['authentication_status']:
    st.error("Please login first.")
    st.stop()
elif st.session_state['authentication_status'] is False:
    st.error('Username/password is incorrect')
    st.stop()
elif st.session_state['authentication_status'] is None:
    st.warning('Please enter your username and password')
    st.stop()
    
authenticator.logout()

# =============================================================================
# SESSION STATE INITIALIZATION
# =============================================================================
if "active_view" not in st.session_state:
    st.session_state.active_view = "calendar"  # "calendar" or "conversation"
if "selected_date" not in st.session_state:
    st.session_state.selected_date = None
    st.session_state.selected_start_time = None
    st.session_state.selected_end_time = None
    st.session_state.selected_start_date = None
    st.session_state.selected_end_date = None
if "selected_event_id" not in st.session_state:
    st.session_state.selected_event_id = None
if "grid_data" not in st.session_state:
    st.session_state.grid_data = None
if "last_selected_date" not in st.session_state:
    st.session_state.last_selected_date = None
if "data_editor_key" not in st.session_state:
    st.session_state.data_editor_key = 0
if "prev_cal_response" not in st.session_state:
    st.session_state.prev_cal_response = None
if 'calendar_container' not in st.session_state:
    st.session_state.calendar_container = st.empty()

# =============================================================================
# CUSTOM STYLING
# =============================================================================
st.markdown(
    """
    <style>
        /* Adjust margin for main report container */
        .reportview-container {
            margin-top: -2em;
        }
        
        /* Hide the deploy button */
        .stDeployButton {display: none;}
        .stAppDeployButton {visibility: hidden;}

        /* Hide the Streamlit footer */
        .footer {visibility: hidden;}
        .header {visibility: hidden;}

        /* Hide Streamlit's top decoration */
        .stDecoration {display: none;}
    </style>
    """,
    unsafe_allow_html=True,
)

# =============================================================================
# SIDE BAR (Prayer Times, Clock)
# =============================================================================
@st.fragment
def render_sidebar_elements():
    sac.divider(label='Clock', icon='clock', align='center', color='gray')
    html_code = """
                <script src="https://cdn.logwork.com/widget/clock.js"></script>
                <a href="https://logwork.com/clock-widget/" class="clock-time" data-style="default-numeral" data-size="244" data-timezone="Asia/Riyadh">""</a>
                """

    # Encode the HTML to Base64
    encoded_html = base64.b64encode(html_code.encode('utf-8')).decode('utf-8')
    iframe_src = f"data:text/html;base64,{encoded_html}"

    # Create markdown for the iframe embedding the encoded HTML
    clock_markdown = f"""
    <div style="display: flex; justify-content: center; align-items: center; width: 100%;">
        <iframe src="{iframe_src}" 
                scrolling="no"
                style="border: none; overflow: hidden; width: 100%; height: 260px;">
        </iframe>
    </div>
    """

    st.markdown(clock_markdown, unsafe_allow_html=True)
    sac.divider(label='Prayer Time', icon='person-arms-up', align='center', color='gray')
    st.components.v1.iframe("https://offline.tawkit.net/", height=450)
    sac.divider(label='Options', icon='toggles2', align='center', color='gray')

with st.sidebar:
    render_sidebar_elements()
    col1, col2 = st.columns(2) # Create two columns

    with col1:
        is_gregorian_idx = sac.segmented(
            items=[
                sac.SegmentedItem(label='هجري', icon='moon'),
                sac.SegmentedItem(label='ميلادي', icon='calendar-month'),
            ], label='', align='center', bg_color='transparent', return_index=True
        )
        is_gregorian = True if is_gregorian_idx == 1 else False
        
    with col2:
        free_roam_idx = sac.segmented(
            items=[
                sac.SegmentedItem(label='مقيد', icon='lock'),
                sac.SegmentedItem(label='غير مقيد', icon='unlock'),
            ], label='', align='center', bg_color='transparent', return_index=True
        )
        free_roam = True if free_roam_idx == 1 else False
        
    show_conversations_idx = sac.segmented(
            items=[
                sac.SegmentedItem(label='إخفاء الرسائل', icon='envelope-slash'),
                sac.SegmentedItem(label='إظهار الرسائل', icon='whatsapp'),
            ], label='', align='center', bg_color='transparent', return_index=True
        )
    show_conversations = True if show_conversations_idx == 1 else False
        
    show_cancelled_reservations_idx = sac.segmented(
        items=[
            sac.SegmentedItem(label='إخفاء المواعيد الملغاة', icon='calendar2-x'),
            sac.SegmentedItem(label='إظهار المواعيد الملغاة', icon='calendar-event'),
        ], label='', align='center', bg_color='transparent', return_index=True
    )
    show_cancelled_reservations = True if show_cancelled_reservations_idx == 1 else False
        
# =============================================================================
# CALENDAR MODE & RAMADAN HOURS
# =============================================================================
default_gregorian = st.query_params.get("gregorian", "False") == "True"
default_free_roam = st.query_params.get("free_roam", "False") == "True"
default_show_conversations = st.query_params.get("show_conversations", "False") == "False"
st.query_params.free_roam = str(free_roam)
st.query_params.gregorian = str(is_gregorian)
st.query_params.show_conversations = str(show_conversations)

@st.fragment
def render_view():
    dynamic_data_editor_key = f"data_editor_{st.session_state.data_editor_key}"
    if st.session_state.active_view == "data":
        sac.divider(label='Data', icon='layout-text-sidebar-reverse', align='center', color='gray', key=f"data_divider_{dynamic_data_editor_key}")
        
        if st.session_state.selected_start_date and not st.session_state.selected_end_date:
            sel_date = st.session_state.selected_start_date
            hijri_date = Gregorian(*map(int, sel_date.split('-'))).to_hijri().isoformat()
            if st.session_state.selected_view_id in ["timeGridWeek", "timeGridDay", "timelineMonth"] and st.session_state.selected_start_time:
                slot_end_time = (datetime.datetime.strptime(st.session_state.selected_start_time, "%H:%M") + st.session_state.slot_duration_delta).strftime("%H:%M")
                st.markdown(f"#### الأحداث في {hijri_date} {parse_time(st.session_state.selected_start_time)} - {parse_time(slot_end_time)}" if not is_gregorian else f"### Events on {sel_date} {parse_time(st.session_state.selected_start_time)} - {parse_time(slot_end_time)}")
                
                start_time = datetime.datetime.strptime(st.session_state.selected_start_time, "%H:%M").time()
                end_time = datetime.datetime.strptime(slot_end_time, "%H:%M").time()
                
                filtered = [
                    e for e in st.session_state.calendar_events
                    if e.get("start", "").split("T")[0] == sel_date and
                    start_time <= datetime.datetime.strptime(e.get("start", "").split("T")[1][:5], "%H:%M").time() < end_time
                    and not ("محادثة" in e.get('title', "") if not is_gregorian else "Conversation" in e.get('title', ""))
                ]
            else:
                st.markdown(f"#### الأحداث في {hijri_date}" if not is_gregorian else f"### Events on {sel_date}")
                filtered = [
                    e for e in st.session_state.calendar_events
                    if e.get("start", "").split("T")[0] == sel_date and not ("محادثة" in e.get('title', "") if not is_gregorian else "Conversation" in e.get('title', ""))
                ]
        elif st.session_state.selected_start_date and st.session_state.selected_end_date:
            start_date = st.session_state.selected_start_date
            hijri_start_date = Gregorian(*map(int, start_date.split('-'))).to_hijri().isoformat()
            end_date = st.session_state.selected_end_date
            hijri_end_date = Gregorian(*map(int, end_date.split('-'))).to_hijri().isoformat()
            if st.session_state.selected_view_id in ["timeGridWeek", "timeGridDay", "timelineMonth"]:
                start_time = datetime.datetime.strptime(st.session_state.selected_start_time, "%H:%M").time()
                end_time = datetime.datetime.strptime(st.session_state.selected_end_time, "%H:%M").time()
                if not start_date == end_date:
                    st.markdown(
                        f"#### الأحداث من {hijri_start_date} إلى {hijri_end_date}"  if not is_gregorian else f"#### Events from {start_date} to {end_date}"
                )
                else:
                    st.markdown(
                        f"#### الأحداث من {start_time} إلى {end_time} في {hijri_start_date}" if not is_gregorian else f"#### Events from {start_time} to {end_time} in {start_date}")
                filtered = [
                    e for e in st.session_state.calendar_events
                    if start_date <= e.get("start", "").split("T")[0] <= end_date and
                        start_time <= datetime.datetime.strptime(e.get("start", "").split("T")[1][:5], "%H:%M").time() < end_time
                        and not ("محادثة" in e.get('title', "") if not is_gregorian else "Conversation" in e.get('title', ""))
                ]
            else:
                filtered = [
                    e for e in st.session_state.calendar_events
                    if start_date <= e.get("start", "").split("T")[0] <= end_date
                    and not ("محادثة" in e.get('title', "") if not is_gregorian else "Conversation" in e.get('title', ""))
                ]
        else:
            filtered = []

        df = pd.DataFrame(columns=["id", "title", "start", "end", "date", "time", "extendedProps"], data=filtered)
        df['start'] = pd.to_datetime(df['start'])
        df['date'] = df['start'].dt.date
        df['time'] = df['start'].dt.time
        df = df.sort_values(by='time').reset_index(drop=True)
        if not df.empty:
            df['type'] = df.apply(lambda row: "كشف" if not is_gregorian and row.get("extendedProps", {}).get("type", "") == 0 else 
                                              "مراجعة" if not is_gregorian and row.get("extendedProps", {}).get("type", "") == 1 else
                                              "Check-up" if is_gregorian and row.get("extendedProps", {}).get("type", "") == 0 else
                                              "Follow-up" if is_gregorian and row.get("extendedProps", {}).get("type", "") == 1 else
                                              "", axis=1)
        else:
            df['type'] = pd.Series(dtype='object')
        df.drop(columns=['extendedProps', 'start', 'end'], inplace=True)

        edited_df = st.data_editor(
            df,
            column_config={
                "date": st.column_config.DateColumn(
                    "Date" if is_gregorian else "التاريخ الميلادي",
                    default=datetime.datetime.strptime(st.session_state.selected_start_date, "%Y-%m-%d").date(),
                    format="DD/MM/YYYY",
                    required=True
                ),
                "time": st.column_config.TimeColumn(
                    "Time" if is_gregorian else "الوقت",
                    required=True,
                    format="h:mm a",
                    step=7200,
                    default= datetime.datetime.strptime(st.session_state.selected_start_time, "%H:%M").time() if st.session_state.selected_start_time else datetime.time(11, 0) if not is_ramadan(datetime.datetime.strptime(st.session_state.selected_start_date, "%Y-%m-%d").date()) else datetime.time(10, 0),
                    min_value=datetime.time(10, 0),
                    max_value=datetime.time(23, 0),
                ),
                "id": st.column_config.NumberColumn("Phone Number" if is_gregorian else "رقم الهاتف", 
                                                        format="%d", 
                                                        min_value=966500000000, 
                                                        max_value=966599999999, 
                                                        default=int("9665"),
                                                        required=True),
                "type": st.column_config.SelectboxColumn(
                    "Reservation type" if is_gregorian else "نوع الحجز",
                    options=["Check-up", "Follow-up"] if is_gregorian else ["كشف", "مراجعة"],
                    default = ["كشف"] if not is_gregorian else ["Check-up"],
                    required=True,
                ),
                'title': st.column_config.TextColumn("Name" if is_gregorian else "الاسم", required=True),
            },
            column_order=["date", "time", "id", "type", "title"],
            num_rows="dynamic",
            key=dynamic_data_editor_key,
            use_container_width=True,)
        widget_state = st.session_state.get(dynamic_data_editor_key, {})
        
        if not st.session_state.get('_changes_processed') and (widget_state.get("deleted_rows", []) or widget_state.get("edited_rows", []) or widget_state.get("added_rows", [])):
            st.session_state._changes_processed = True
            
            if widget_state.get("deleted_rows", []):
                deleted = 0
                for row_idx in widget_state["deleted_rows"]:
                    orig_row = df.iloc[row_idx]
                    result = cancel_reservation(orig_row['id'], str(orig_row['date']), ar=True)
                    if result.get("success", "") == True:
                        deleted+=1                        
                    else:
                        st.error(result.get("message", ""))
                        time.sleep(2)
                        st.session_state._changes_processed = False
                        st.rerun()
                if deleted>0:
                    st.success(f"{deleted} Reservations cancelled." if is_gregorian else f"تم الغاء {deleted} حجوزات.")
                    time.sleep(2)
                    st.session_state._changes_processed = False
                    st.rerun()
                
            if widget_state.get("edited_rows", []):
                modified = 0
                for row_idx, change in widget_state.get("edited_rows", {}).items():
                    orig_row = df.iloc[row_idx]
                    curr_row = edited_df.iloc[row_idx]
                    if change and not orig_row.equals(curr_row):
                        if 'id' in change:
                            result = modify_id(str(orig_row['id']), str(change['id']), ar=True)
                            if result.get("success", "") == True:
                                st.success("Phone number changed." if is_gregorian else "تم تعديل رقم الهاتف.")
                                modified+=1
                            else:
                                st.error(result.get("message", ""))
                                time.sleep(2)
                                st.session_state._changes_processed = False
                                st.rerun()
                        else:
                            # Adjust time to consider only the hour
                            curr_row['time'] = curr_row['time'].replace(minute=0, second=0, microsecond=0)
                            result = modify_reservation(str(orig_row['id']), str(curr_row['date']), str(curr_row['time']), str(curr_row['title']), 0 if curr_row['type'] in ["كشف", "Check-up"] else 1)
                            if result.get("success", "") == True:
                                modified+=1
                            else:
                                st.error(result.get("message", ""))
                                time.sleep(2)
                                st.session_state._changes_processed = False
                                st.rerun()
                if modified ==len(widget_state.get("edited_rows")):
                    st.success(f"{modified} Reservations changed." if is_gregorian else f"تم تعديل {modified} حجوزات.")
                    time.sleep(1)
                    st.session_state._changes_processed = False
                    st.rerun()
            if widget_state.get("added_rows", []):
                added = 0
                for added_row in widget_state.get("added_rows", []):
                    curr_row = edited_df.iloc[-1]
                    result = reserve_time_slot(str(curr_row['id']), str(curr_row['title']), str(curr_row['date']), str(curr_row['time']), 0 if curr_row['type'] in ["كشف", "Check-up"] else 1, max_reservations=6, ar=True)
                    if result.get("success", "") == True:
                        added+=1
                    else:
                        st.error(result.get("message", ""))
                        time.sleep(2)
                        st.session_state._changes_processed = False
                        st.rerun()
                if added == len(widget_state.get("added_rows", [])):
                    st.success(f"{added} Reservations added." if is_gregorian else f"تم إضافة {added} حجوزات.")
                    time.sleep(2)
                    st.session_state._changes_processed = False
                    st.rerun()

    elif st.session_state.active_view == "conversation":
        sac.divider(label='Conversation', icon='chat-dots-fill', align='center', color='gray')
        render_conversation(st.session_state.conversations, is_gregorian, st.session_state.reservations)

@st.fragment
def render_cal():
    try:
        st.session_state.reservations = get_all_reservations(future=True)
        st.session_state.conversations = get_all_conversations(recent='month')
        if show_cancelled_reservations:
            st.session_state.cancelled_reservations = get_all_reservations(future=False, cancelled_only=True)
    except Exception as e:
        st.error(f"Data loading failed, {e}" if is_gregorian else f"فشل تحميل قاعدة البيانات, {e}")
        st.stop()
    st.session_state.calendar_container.empty()
    with st.session_state.calendar_container.container():
        mode_names = {
            "timeGridWeek": "شبكة الوقت" if not is_gregorian else "Week Grid",
            "timelineMonth": "الجدول الزمني" if not is_gregorian else "Timeline",
            "listMonth": "القائمة" if not is_gregorian else "List",
            "multiMonthYear": "عدة أشهر" if not is_gregorian else "Multi-Month",
        }
        sac.divider(label='Calendar', icon='calendar4', align='center', color='gray', key="cal_divider")
        selected_view_idx = sac.segmented(
            items=[
                sac.SegmentedItem(label=mode_names["timeGridWeek"], icon='calendar2-range'),
                sac.SegmentedItem(label=mode_names["timelineMonth"], icon='grid-1x2-fill'),
                sac.SegmentedItem(label=mode_names["listMonth"], icon='list'),
                sac.SegmentedItem(label=mode_names["multiMonthYear"], icon='calendar2-week')
            ], 
            label='', 
            align='center', 
            bg_color='gray',
            use_container_width=True,
            return_index=True
        )
        selected_view_label = list(mode_names.values())[selected_view_idx]
        reverse_mode_names = {v: k for k, v in mode_names.items()}
        st.session_state.selected_view_id = reverse_mode_names.get(selected_view_label, "dayGridMonth")
        
        ramadan_rules = []
        for year in range(2022, 2031):
            start_date, end_date = get_ramadan_dates(year)
            if start_date and end_date:
                rule = {
                    "daysOfWeek": [0, 1, 2, 3, 4, 6],
                    "startTime": "10:00",
                    "endTime": "16:00",
                    "startRecur": start_date.isoformat(),
                    "endRecur": end_date.isoformat(),
                }
                ramadan_rules.append(rule)

        normal_rules = [
            {
                "daysOfWeek": [0, 1, 2, 3, 4],
                "startTime": "11:00",
                "endTime": "17:00",
                "startRecur": "2022-01-01",
                "endRecur": "2031-12-31",
            },
            {
                "daysOfWeek": [6],
                "startTime": "17:00",
                "endTime": "22:00",
                "startRecur": "2022-01-01",
                "endRecur": "2031-12-31",
            },
        ]

        normal_rules = subtract_ramadan_from_normal(normal_rules, ramadan_rules)

        initial_date = st.session_state.selected_start_date if st.session_state.selected_start_date else datetime.date.today().isoformat()
        
        # Get day of week (0-6, where 0 is Sunday, 6 is Saturday)
        initial_dt = datetime.datetime.fromisoformat(initial_date) if isinstance(initial_date, str) else initial_date
        day_of_week = initial_dt.weekday() if isinstance(initial_dt, datetime.datetime) else datetime.datetime.fromisoformat(initial_date).weekday()
        # Convert to Python's weekday (Monday is 0) to calendar weekday (Sunday is 0)
        day_of_week = (day_of_week + 1) % 7

        # Set min and max times based on conditions
        if free_roam or show_conversations:
            slot_min_time = "00:00:00"
            slot_max_time = "24:00:00"
        elif is_ramadan(initial_date):
            slot_min_time = "10:00:00"
            slot_max_time = "16:00:00"
        elif day_of_week == 6:  # Saturday
            slot_min_time = "17:00:00"
            slot_max_time = "22:00:00"
        else:  # Sunday through Thursday
            slot_min_time = "11:00:00" 
            slot_max_time = "17:00:00"

        big_cal_options = {
            "editable": True,
            "selectable": True,
            "eventStartEditable": True,
            "eventDurationEditable": False,
            "expandRows": True,
            "navLinks": True,
            "weekNumbers": False,
            "buttonIcons": True,
            "nowIndicator": True,
            "slotMinTime": slot_min_time,
            "slotMaxTime": slot_max_time,
            "allDaySlot": False,
            "hiddenDays": [5] if not show_conversations else [],
            "slotDuration": "02:00:00",
            "locale": "ar-sa" if not is_gregorian else "en",
            "direction": "rtl"  if not is_gregorian else "ltr",
            "firstDay": 6,
            "aspectRatio": 1.35,
            "expandRows": True,
            "initialDate": initial_date,
            "initialView": st.session_state.selected_view_id,
            "timeZone": "Asia/Riyadh",
            "businessHours": ramadan_rules + normal_rules if not free_roam else None,
            "eventConstraint": "businessHours" if not free_roam else None,
            "selectConstraint": "businessHours" if not free_roam else None,
            "buttonText": {
                "today": "اليوم",
                "month": "شهر",
                "week": "أسبوع",
                "day": "يوم",
                "multiMonthYear": "عدة أشهر"} if not is_gregorian else {
                "today": "today",
                "month": "month",
                "week": "week",
                "day": "day",
                "multiMonthYear": "multiMonthYear"}
        }
        st.session_state.slot_duration_delta = datetime.timedelta(hours=int(big_cal_options['slotDuration'].split(":")[0]), 
                                            minutes=int(big_cal_options['slotDuration'].split(":")[1]))
        num_reservations_per_slot = 6
        
        if st.session_state.selected_view_id in ["dayGridMonth", "timeGridWeek", "timeGridDay"]:
            big_cal_options.update({
                "headerToolbar": {
                    "left": "today prev,next",
                    "center": "title",
                    "right": None,
                }
            })
        elif st.session_state.selected_view_id == "timelineMonth":
            big_cal_options.update({
                "headerToolbar": {
                    "left": "today prev,next",
                    "center": "title",
                    "right": None
                }
            })
        elif st.session_state.selected_view_id == "listMonth":
            big_cal_options.update({
                "headerToolbar": {
                    "left": "today prev,next",
                    "center": "title",
                    "right": None
                }
            })
        elif st.session_state.selected_view_id == "multiMonthYear":
            big_cal_options.update({
                "headerToolbar": {
                    "left": "today prev,next",
                    "center": "title",
                    "right": "dayGridMonth"
                }
            })
        else:
            big_cal_options.update({
                "headerToolbar": {
                    "left": "today prev,next",
                    "center": "title",
                    "right": "dayGridMonth,timeGridWeek,timeGridDay,listMonth"
                }
            })

        st.session_state.calendar_events = []

        # Step 1: Group reservations by date and time slot
        grouped_reservations = {}
        for id, customer_reservations in st.session_state.reservations.items():
            for reservation in customer_reservations:
                if isinstance(reservation, dict) and reservation.get("customer_name", ""):
                    date_str = reservation.get("date")
                    time_str = reservation.get("time_slot")
                    key = f"{date_str}_{time_str}"
                    if key not in grouped_reservations:
                        grouped_reservations[key] = []
                    grouped_reservations[key].append((id, reservation))
        
        # Step 1.5: Sort each group by reservation type
        for key in grouped_reservations:
            grouped_reservations[key].sort(key=lambda x: (x[1].get("type", 0), x[1].get("customer_name", "")))

        # Step 2: Process each time slot group sequentially
        for time_key, reservations in grouped_reservations.items():
            previous_end_dt = None
            for id, reservation in reservations:
                customer_name = reservation.get("customer_name", "")
                date_str = reservation.get("date")
                time_str = reservation.get("time_slot")
                type = reservation.get("type")
                
                try:
                    # Parse the start datetime
                    start_dt = datetime.datetime.strptime(f"{parse_date(date_str)}T{parse_time(time_str)}", "%Y-%m-%dT%I:%M %p")
                    
                    # If we have a previous end time in this slot, start after it
                    if previous_end_dt and start_dt <= previous_end_dt:
                        start_dt = previous_end_dt + datetime.timedelta(minutes=1)
                    
                    # Calculate end time
                    end_dt = start_dt + st.session_state.slot_duration_delta / num_reservations_per_slot
                    previous_end_dt = end_dt
                except ValueError as e:
                    st.error(f"Incorrect time format found: {e}")
                    st.stop()
                # Reservation event properties
                event = {
                    "id": id,
                    "title": customer_name,
                    "start": start_dt.isoformat(),
                    "end": end_dt.isoformat(),
                    "backgroundColor": "#4caf50" if type == 0 else "#3688d8",
                    "borderColor": "#4caf50" if type == 0 else "#3688d8",
                    # "textColor": "#FFFFFF" if type == 0 else "",
                    "extendedProps": {
                        "type": type
                    }
                }
                st.session_state.calendar_events.append(event)

        if show_cancelled_reservations:
            for id, customer_reservations in st.session_state.cancelled_reservations.items():
                for reservation in customer_reservations:
                    if isinstance(reservation, dict) and reservation.get("customer_name", ""):
                        customer_name = reservation.get("customer_name")
                        date_str = reservation.get("date")
                        time_str = reservation.get("time_slot")
                        type = reservation.get("type")
                        try:
                            start_dt = datetime.datetime.strptime(f"{parse_date(date_str)}T{parse_time(time_str)}", "%Y-%m-%dT%I:%M %p")
                            end_dt = start_dt + st.session_state.slot_duration_delta / num_reservations_per_slot
                        except ValueError as e:
                            st.error(f"incorrect time format found, {e}")
                            st.stop()
                            
                        # Cancelled reservations properties
                        event = {
                            "id": id,
                            "title": customer_name,
                            "start": start_dt.isoformat(),
                            "end": end_dt.isoformat(),
                            "editable": False,
                            "backgroundColor": "#e5e1e0",
                            "textColor": "#908584",
                            "BorderColor": "#e5e1e0" if type == 0 else "#e5e1e0",
                            "extendedProps": {
                                "type": type
                            }
                        }
                        st.session_state.calendar_events.append(event)
                    
        if show_conversations:
            for id, conversation in st.session_state.conversations.items():
                if isinstance(conversation, list):
                    if id in st.session_state.reservations:
                        continue
                    date_str = conversation[-1].get("date", "")
                    if not date_str:
                        continue
                    time_str = conversation[-1].get("time")
                    try:
                        start_dt = datetime.datetime.strptime(f"{parse_date(date_str)}T{parse_time(time_str)}", "%Y-%m-%dT%I:%M %p")
                        end_dt = start_dt + st.session_state.slot_duration_delta / num_reservations_per_slot
                    except ValueError as e:
                        st.error(f"incorrect time format found, {e}")
                        st.stop()
                    event = {
                        "id": id,
                        "title": f"محادثة: {id}" if not is_gregorian else f"Conversation: {id}",
                        "start": start_dt.isoformat(),
                        "end": end_dt.isoformat(),
                        "editable": False,
                        "backgroundColor": "#EDAE49"
                    }
                    st.session_state.calendar_events.append(event)
            
        events_hash = hashlib.md5(json.dumps(st.session_state.calendar_events, sort_keys=True).encode()).hexdigest()
        big_cal_response = calendar(
            events=st.session_state.calendar_events,
            options=big_cal_options,
            custom_css="""
                        .fc-event-past {
                            opacity: 0.6;
                        }
                        .fc-event-time {
                            font-style: italic;
                        }
                        .fc-event-title {
                            font-weight: 700;
                        }
                        .fc-toolbar-title {
                            font-size: 2rem;
                        }
                        """,
            key=f"big_calendar_{st.session_state.selected_view_id}_{events_hash}",
        )
        
        if big_cal_response.get("callback") in ['dateClick', 'select', 'eventClick']:
            st.session_state.prev_cal_response = big_cal_response
            cb_type = big_cal_response.get("callback")
        elif st.session_state.prev_cal_response and big_cal_response.get("callback") not in ['eventChange']:
            cb_type = st.session_state.prev_cal_response.get("callback")
            big_cal_response = st.session_state.prev_cal_response
        else:
            cb_type = big_cal_response.get("callback")
            
        if cb_type == "dateClick":
            view_type = big_cal_response.get("dateClick", {}).get("view", {}).get("type", "")
            clicked_date = big_cal_response.get("dateClick", {}).get("date", "")
            if clicked_date:
                if view_type in ["dayGridMonth", "multiMonthYear"]:
                    st.session_state.selected_start_date = clicked_date.split("T")[0]
                    st.session_state.selected_start_time = None
                elif view_type in ["timeGridWeek", "timeGridDay", "timelineMonth"]:
                    parts = clicked_date.split("T")
                    st.session_state.selected_start_date = parts[0]
                    st.session_state.selected_start_time = parts[1][:5]
                st.session_state.active_view = "data"
                st.session_state.selected_end_date = None
                st.session_state.selected_end_time = None
                st.session_state.selected_event_id = None
            st.session_state.data_editor_key +=1
            render_view()

        elif cb_type == "select":
            st.session_state.prev_cal_response = big_cal_response
            selected_start = big_cal_response.get("select", {}).get("start", "")
            selected_end = big_cal_response.get("select", {}).get("end", "")
            if selected_start and selected_end:
                st.session_state.selected_start_date = selected_start.split("T")[0]
                st.session_state.selected_end_date = selected_end.split("T")[0]
                if st.session_state.selected_view_id in ["timeGridWeek", "timeGridDay", "timelineMonth"]:
                    st.session_state.selected_start_time = selected_start.split("T")[1][:5]
                    st.session_state.selected_end_time = selected_end.split("T")[1][:5]
                else:
                    st.session_state.selected_start_time = None
                    st.session_state.selected_end_time = None
                st.session_state.active_view = "data"
                st.session_state.selected_event_id = None
            st.session_state.data_editor_key +=1
            render_view()

        elif cb_type == "eventClick":
            st.session_state.prev_cal_response = big_cal_response
            event_clicked = big_cal_response.get("eventClick", {}).get("event", {})
            event_id = event_clicked.get("id")
            if event_id:
                st.session_state.selected_event_id = event_id
                st.session_state.active_view = "conversation"
                st.session_state.selected_date = None
                st.session_state.data_editor_key +=1
                render_view()
                
        elif cb_type =="eventChange":
            event = big_cal_response.get("eventChange", {}).get("event", {})
            new_start_date = pd.to_datetime(event['start']).date()
            new_time = pd.to_datetime(event['start']).time()
            ev_type = big_cal_response.get("eventChange", {}).get("event", {}).get("extendedProps").get("type")
            result = modify_reservation(event['id'], str(new_start_date), str(new_time), str(event['title']), ev_type, approximate=True, ar=True)
            if result.get("success", "") == True:
                st.toast("Reservation changed." if is_gregorian else "تم تعديل الحجز.")
                time.sleep(1)
                st.session_state.selected_start_time = str(new_start_date)
                st.session_state.selected_event_id = None
                st.session_state.selected_end_time = None
                st.rerun(scope='fragment')
            else:
                st.warning(result.get("message", ""))
    # st.json(big_cal_response, expanded=True)
# =============================================================================
# RENDER CONVERSATION FUNCTION
# =============================================================================
@st.fragment
def render_conversation(conversations, is_gregorian, reservations):
    st.markdown(
        """
        <style>
        .tooltip-container {
            position: relative;
            display: inline-block;
        }
        .tooltip-text {
            visibility: hidden;
            background-color: #555;
            color: #fff;
            text-align: center;
            border-radius: 6px;
            padding: 5px 8px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0;
            transition: opacity 0.3s;
            white-space: nowrap;
        }
        .tooltip-container:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
    # print(conversations)
    if st.session_state.selected_event_id in conversations:
        # First create/prepare the options list
        options = []
        for option in conversations:
            if option in reservations and isinstance(reservations[option], list) and len(reservations[option]) > 0 and reservations[option][0].get('customer_name', ""):
                options.append(f"{option} - {reservations[option][0].get('customer_name')}")
            else:
                options.append(option)
        options.sort(key=lambda x: (len(x), conversations[x.split(" - ")[0].strip()][-1].get("date", "")), reverse=True)
        index = next((i for i, opt in enumerate(options) if str(opt).startswith(st.session_state.selected_event_id)), 0)

        # Add custom CSS for better alignment
        st.markdown("""
            <style>
            .nav-arrow-container {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
            }
            .stButton button {
                padding: 0 10px;
                height: 38px;
                line-height: 1;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            div[data-testid="stVerticalBlock"] > div[data-testid="column"] {
                display: flex;
                align-items: center;
            }
            </style>
        """, unsafe_allow_html=True)

        # Create columns with better proportions for the navigation
        col1, col2, col3 = st.columns([1, 10, 1])

        # Left arrow (previous)
        with col1:
            st.markdown('<div class="nav-arrow-container">', unsafe_allow_html=True)
            prev_btn = st.button("◀", key="prev_conversation", use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)

        # Selectbox
        with col2:
            selected_event_id = st.selectbox(
                "Select or write a number..." if is_gregorian else "اختر أو اكتب رقمًا...",
                options=options,
                index=index,
            )

        # Right arrow (next)
        with col3:
            st.markdown('<div class="nav-arrow-container">', unsafe_allow_html=True)
            next_btn = st.button("▶", key="next_conversation", use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)

        # Handle navigation button clicks
        if prev_btn and len(options) > 0:
            new_index = (index - 1) % len(options)
            st.session_state.selected_event_id = options[new_index].split(" - ")[0].strip()
            st.rerun(scope="fragment")

        if next_btn and len(options) > 0:
            new_index = (index + 1) % len(options)
            st.session_state.selected_event_id = options[new_index].split(" - ")[0].strip()
            st.rerun(scope="fragment")

        # Handle selectbox changes
        if st.session_state.selected_event_id != selected_event_id.split("-")[0].strip():
            st.session_state.selected_event_id = selected_event_id.split("-")[0].strip()
            st.rerun(scope="fragment")
        
        conversation = conversations[st.session_state.selected_event_id.split(" - ")[0] if " - " in selected_event_id else selected_event_id]
        if conversation and isinstance(conversation, list) and conversation[0].get("role"):
            for msg in conversation:
                role = msg.get("role")
                message = msg.get("message")
                raw_timestamp = msg.get("time", None)
                msg_date = msg.get("date", "")
                if raw_timestamp:
                    try:
                        time_obj = datetime.datetime.strptime(raw_timestamp, "%H:%M:%S") if ":" in raw_timestamp else datetime.datetime.strptime(raw_timestamp, "%I:%M %p")
                        formatted_timestamp = time_obj.strftime("%I:%M %p")
                    except Exception:
                        formatted_timestamp = raw_timestamp
                else:
                    formatted_timestamp = "No timestamp"
                
                tooltip_html = f"""
                <div class="tooltip-container">
                    <span style="text-decoration: none;">{message}</span>
                    <div class="tooltip-text">{msg_date} {formatted_timestamp}</div>
                </div>
                """
                with st.chat_message(role):
                    st.markdown(tooltip_html, unsafe_allow_html=True)
                    
            prompt = st.chat_input(
                "اكتب ردًا..." if not is_gregorian else "Reply...",
                key=f"chat_input_{st.session_state.selected_event_id}", 
            )

            if prompt:
                datetime_obj = datetime.datetime.now()
                curr_date = datetime_obj.date().isoformat()
                curr_time = datetime_obj.strftime("%I:%M %p")
                new_message = {
                    "role": st.session_state["username"],
                    "message": prompt,
                    "time": curr_time,
                    "date": curr_date,
                }
                conversation.append(new_message)
                send_whatsapp_message(st.session_state.selected_event_id, prompt)
                append_message(st.session_state.selected_event_id, st.session_state["username"], prompt, curr_date, curr_time)
                st.rerun(scope="fragment")
        else:
            st.warning("لم يتم العثور على بيانات المحادثة لهذا الحدث." if not is_gregorian else "No conversation data found for this event.")

# =============================================================================
# MAIN APP EXECUTION
# =============================================================================
render_cal()
st_autorefresh(interval=350000)