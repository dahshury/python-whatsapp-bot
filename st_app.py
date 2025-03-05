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

from app.frontend import (authenticate, bootstrap_hijri_datepicker,
                          get_ramadan_dates, is_ramadan,
                          render_conversation,
                          subtract_ramadan_from_normal)
from app.services.assistant_functions import (cancel_reservation,
                                              get_all_conversations,
                                              get_all_reservations, modify_id,
                                              modify_reservation, parse_date,
                                              parse_time, reserve_time_slot)
from app.utils.whatsapp_utils import send_whatsapp_message

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
if "chat_conversations" not in st.session_state:
    st.session_state.chat_conversations = {}
if "data_editor_key" not in st.session_state:
    st.session_state.data_editor_key = 0
if "prev_cal_response" not in st.session_state:
    st.session_state.prev_cal_response = None
    
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
        footer {visibility: hidden;}

        /* Hide Streamlit's top decoration */
        #stDecoration {display: none;}
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
    # st.markdown(
    #     """
    #     <iframe src="https://timesprayer.com/widgets.php?frame=2&amp;lang=ar&amp;name=makkah&amp;sound=true&amp;fcolor=748BA4&amp;tcolor=474747&amp;frcolor=ff4b4b" 
    #             style="border: none; overflow: hidden; width: 100%; height: 227px;"></iframe>
    #     """,
    #     unsafe_allow_html=True,
    # )
    # prayer_html = load_html("./app/frontend/tawkit/index.html")
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
            sac.SegmentedItem(label='إخفاء المواعيد الملغاة', icon='calendar-event'),
            sac.SegmentedItem(label='إظهار المواعيد الملغاة', icon='calendar2-x'),
        ], label='', align='center', bg_color='transparent', return_index=True
    )
    show_cancelled_reservations = True if show_cancelled_reservations_idx == 1 else False
        
# =============================================================================
# CALENDAR MODE & RAMADAN HOURS
# =============================================================================
# Retrieve the default value for ramadan from the query params.
default_gregorian = st.query_params.get("gregorian", "False") == "True"
default_free_roam = st.query_params.get("free_roam", "False") == "True"
default_show_conversations = st.query_params.get("show_conversations", "False") == "False"
st.query_params.free_roam = str(free_roam)
st.query_params.gregorian = str(is_gregorian)
st.query_params.show_conversations = str(show_conversations)

if 'calendar_rendered' not in st.session_state:
    st.session_state.calendar_rendered = False

# =============================================================================
# DATA LOADING
# =============================================================================
try:
    st.session_state.reservations = get_all_reservations(future=True)
    if show_conversations:
        st.session_state.conversations = get_all_conversations()
    if show_cancelled_reservations:
        st.session_state.cancelled_reservations = get_all_reservations(future=False, cancelled_only=True)
except Exception as e:
    st.error(f"Data loading failed, {e}" if is_gregorian else f"فشل تحميل قاعدة البيانات, {e}")
    st.stop()
    
@st.fragment
def render_view():
    # =============================================================================
    # MAIN VIEW RENDERING (DATA VIEW OR CONVERSATION VIEW)
    # =============================================================================
    dynamic_data_editor_key = f"data_editor_{st.session_state.data_editor_key}"
    if st.session_state.active_view == "data":
        sac.divider(label='Data', icon='layout-text-sidebar-reverse', align='center', color='gray')
        
        # Check if we have a single-date click or a date range selection
        if st.session_state.selected_start_date and not st.session_state.selected_end_date:
            sel_date = st.session_state.selected_start_date
            hijri_date = Gregorian(*map(int, sel_date.split('-'))).to_hijri().isoformat()
            if st.session_state.selected_view_id in ["timeGridWeek", "timeGridDay", "timelineMonth"] and st.session_state.selected_start_time:
                # Time-based view: filter both date and the start time slot
                slot_end_time = (datetime.datetime.strptime(st.session_state.selected_start_time, "%H:%M") + st.session_state.slot_duration_delta).strftime("%H:%M")
                st.markdown(f"#### الأحداث في {hijri_date} {st.session_state.selected_start_time} - {slot_end_time}" if not is_gregorian else f"### Events on {sel_date} {st.session_state.selected_start_time} - {slot_end_time}")
                filtered = [
                    e for e in st.session_state.calendar_events
                    if e.get("start", "").split("T")[0] == sel_date and
                    st.session_state.selected_start_time <= e.get("start", "").split("T")[1][:5] <= slot_end_time
                    and not ("محادثة" in e.get('title', "") if not is_gregorian else "Conversation" in e.get('title', ""))
                ]
            else:
                # All-day view: filter only by date
                st.markdown(f"#### الأحداث في {hijri_date}" if not is_gregorian else f"### Events on {sel_date}")
                
                filtered = [
                    e for e in st.session_state.calendar_events
                    if e.get("start", "").split("T")[0] == sel_date and not ("محادثة" in e.get('title', "") if not is_gregorian else "Conversation" in e.get('title', ""))
                ]
        elif st.session_state.selected_start_date and st.session_state.selected_end_date:
            start_date = st.session_state.selected_start_date
            end_date = st.session_state.selected_end_date
            st.markdown(
                f"#### الأحداث من {start_date} إلى {end_date}"
            )
            if st.session_state.selected_view_id in ["timeGridWeek", "timeGridDay", "timelineMonth"]:
                start_time = st.session_state.selected_start_time
                end_time = st.session_state.selected_end_time
                filtered = [
                    e for e in st.session_state.calendar_events
                    if start_date <= e.get("start", "").split("T")[0] <= end_date and
                        start_time <= e.get("start", "").split("T")[1][:5] <= end_time
                ]
            else:
                filtered = [
                    e for e in st.session_state.calendar_events
                    if start_date <= e.get("start", "").split("T")[0] <= end_date
                ]
        else:
            filtered = []


        # Create a DataFrame from the filtered events and convert date strings to datetime objects
        df = pd.DataFrame(columns=["id", "title", "start", "end", "date", "time", "extendedProps"], data=filtered)
        df['start'] = pd.to_datetime(df['start'])
        df['date'] = df['start'].dt.date
        df['time'] = df['start'].dt.time
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
                    format="h:mm a",  # 12-hour format with AM/PM
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
        
        # Only process changes if they exist and haven't been handled
        if not st.session_state.get('_changes_processed') and (widget_state.get("deleted_rows", []) or widget_state.get("edited_rows", []) or widget_state.get("added_rows", [])):
            st.session_state._changes_processed = True  # Mark changes as processed
            
            if widget_state.get("deleted_rows", []):
                for row_idx in widget_state["deleted_rows"]:
                    orig_row = df.iloc[row_idx]
                    result = cancel_reservation(orig_row['id'], str(orig_row['date']), str(orig_row['time']))
                    if result.get("success", "") == True:
                        # already_deleted.append(row_idx)
                        # df.drop(index=row_idx, inplace=True)
                        st.success("Reservation cancelled." if is_gregorian else "تم الغاء الحجز.")
                    else:
                        st.error(result.get("message", ""))
                time.sleep(1)
                st.session_state.data_editor_key+=1
                st.session_state._changes_processed = False
                st.rerun()
                
            if widget_state.get("edited_rows", []):
                for row_idx, change in widget_state.get("edited_rows", {}).items():
                    orig_row = df.iloc[row_idx]
                    curr_row = edited_df.iloc[row_idx]
                    if change and not orig_row.equals(curr_row):
                        if 'id' in change:
                            result = modify_id(orig_row['id'], change['id'])
                            if result.get("success", "") == True:
                                st.success("Phone number changed." if is_gregorian else "تم تعديل رقم الهاتف.")
                                time.sleep(1)
                                st.session_state.data_editor_key+=1
                                st.rerun()
                            else:
                                st.error(result.get("message", ""))
                        else:
                            result = modify_reservation(orig_row['id'], str(curr_row['date']), str(curr_row['time']), str(curr_row['title']), 0 if curr_row['type'] in ["كشف", "Check-up"] else 1)
                            if result.get("success", "") == True:
                                st.success("Reservation changed." if is_gregorian else "تم تعديل الحجز.")
                                time.sleep(1)
                                st.session_state.data_editor_key+=1
                                st.rerun()
                            else:
                                st.error(result.get("message", ""))

            if widget_state.get("added_rows", []):
                for added_row in widget_state.get("added_rows", []):
                    curr_row = edited_df.iloc[-1]
                    # Proceed with reservation logic
                    result = reserve_time_slot(curr_row['id'], curr_row['title'], str(curr_row['date']), str(curr_row['time']), 0 if curr_row['type'] in ["كشف", "Check-up"] else 1, max_reservations=6)
                    if result.get("success", "") == True:
                        st.success("Reservation added." if is_gregorian else "تم إضافة الحجز.")
                        time.sleep(1)
                        st.session_state.data_editor_key+=1
                        st.rerun()
                        
                    else:
                        st.error(result.get("message", ""))
        st.session_state._changes_processed = False
        st.json(widget_state)  # Optional: for debugging
    # =============================================================================
    # CONVERSATION VIEW
    # =============================================================================
    elif st.session_state.active_view == "conversation" and show_conversations:
        sac.divider(label='Conversation', icon='chat-dots-fill', align='center', color='gray')
        render_conversation(st.session_state.conversations, is_gregorian, st.session_state.reservations)
        
@st.fragment
def render_cal():
    # Define view IDs mapped to display labels (with emojis)
    mode_names = {
        "timeGridWeek": "شبكة الوقت" if not is_gregorian else "Week Grid",
        "timelineMonth": "الجدول الزمني" if not is_gregorian else "Timeline",
        "listMonth": "القائمة" if not is_gregorian else "List",
        "multiMonthYear": "عدة أشهر" if not is_gregorian else "Multi-Month",
    }
    # Create a horizontal option menu for view selection.
    sac.divider(label='Calendar', icon='calendar4', align='center', color='gray')
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
    # Reverse mapping: from label back to view ID.
    reverse_mode_names = {v: k for k, v in mode_names.items()}
    st.session_state.selected_view_id = reverse_mode_names.get(selected_view_label, "dayGridMonth")
    
    # Generate business hours rules for Ramadan for a range of years.
    ramadan_rules = []
    for year in range(2022, 2031):  # Adjust the range as needed.
        start_date, end_date = get_ramadan_dates(year)
        if start_date and end_date:
            rule = {
                "daysOfWeek": [0, 1, 2, 3, 4, 6],
                "startTime": "10:00",
                "endTime": "16:00",
                "startRecur": start_date.isoformat(),  # Inclusive start date
                "endRecur": end_date.isoformat(),        # Non-inclusive end date
            }
            ramadan_rules.append(rule)

    # Define the normal business hours rules for non-Ramadan periods.
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
    # Define common options for the calendar
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
        "slotMinTime": "10:00:00" if not free_roam and is_ramadan(initial_date) else "11:00:00" if not free_roam else "00:00:00",
        "slotMaxTime": "22:00:00" if not free_roam else "24:00:00",
        "allDaySlot": False,
        "hiddenDays": [5],
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
        # Arabic button labels
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
    # =============================================================================
    # BIG CALENDAR OPTIONS, DATA FEEDING, RENDERING
    # =============================================================================
    # Define headerToolbar based on selected view
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

    # Create Calendar Events from the database
    st.session_state.calendar_events = []
    for id, customer_reservations in st.session_state.reservations.items():
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
                
                event = {
                    "id": id,  # use the original wa_id so reservation data can be found
                    "title": customer_name,
                    "start": start_dt.isoformat(),
                    "end": end_dt.isoformat(),
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
                    
                    event = {
                        "id": id,  # use the original wa_id so reservation data can be found
                        "title": customer_name,
                        "start": start_dt.isoformat(),
                        "end": end_dt.isoformat(),
                        "backgroundColor": "#474747",
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
                date_str = conversation[0].get("date", "")
                if not date_str:
                    continue
                time_str = conversation[0].get("time")
                try:
                    start_dt = datetime.datetime.strptime(f"{parse_date(date_str)}T{parse_time(time_str)}", "%Y-%m-%dT%I:%M %p")
                    end_dt = start_dt + st.session_state.slot_duration_delta / num_reservations_per_slot
                except ValueError as e:
                    st.error(f"incorrect time format found, {e}")
                    st.stop()
                event = {
                    "id": id,  # use the original wa_id so reservation data can be found
                    "title": f"محادثة: {id}" if not is_gregorian else f"Conversation: {id}",
                    "start": start_dt.isoformat(),
                    "end": end_dt.isoformat(),
                    "editable": False,
                    "backgroundColor": "#EDAE49"
                }
                st.session_state.calendar_events.append(event)
        
    events_hash = hashlib.md5(json.dumps(st.session_state.calendar_events, sort_keys=True).encode()).hexdigest()
    # Render the big calendar
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
    # =============================================================================
    # PROCESS CALLBACKS FROM THE BIG CALENDAR
    # =============================================================================
    if big_cal_response.get("callback") in ['dateClick', 'select', 'eventClick']:
        st.session_state.prev_cal_response = big_cal_response
        cb_type = big_cal_response.get("callback")
    elif st.session_state.prev_cal_response and big_cal_response.get("callback") not in ['eventChange']:
        cb_type = st.session_state.prev_cal_response.get("callback")
        big_cal_response = st.session_state.prev_cal_response
    else:
        cb_type = big_cal_response.get("callback")
        
    # Handle dateClick callbacks
    if cb_type == "dateClick":
        view_type = big_cal_response.get("dateClick", {}).get("view", {}).get("type", "")
        clicked_date = big_cal_response.get("dateClick", {}).get("date", "")
        if clicked_date:
            # For "all-day" views, only consider the date (ignoring time)
            if view_type in ["dayGridMonth", "multiMonthYear"]:
                st.session_state.selected_start_date = clicked_date.split("T")[0]
                st.session_state.selected_start_time = None
            # For time-based views, record both date and start time
            elif view_type in ["timeGridWeek", "timeGridDay", "timelineMonth"]:
                parts = clicked_date.split("T")
                st.session_state.selected_start_date = parts[0]
                st.session_state.selected_start_time = parts[1][:5]
            st.session_state.active_view = "data"
            st.session_state.selected_end_date = None
            st.session_state.selected_end_time = None
            st.session_state.selected_event_id = None
        render_view()

    # Handle select callbacks
    elif cb_type == "select":
        st.session_state.prev_cal_response = big_cal_response
        selected_start = big_cal_response.get("select", {}).get("start", "")
        selected_end = big_cal_response.get("select", {}).get("end", "")
        if selected_start and selected_end:
            st.session_state.selected_start_date = selected_start.split("T")[0]
            st.session_state.selected_end_date = selected_end.split("T")[0]
            # For time-based views, also capture start and end times; for all-day views, ignore times
            if st.session_state.selected_view_id in ["timeGridWeek", "timeGridDay", "timelineMonth"]:
                st.session_state.selected_start_time = selected_start.split("T")[1][:5]
                st.session_state.selected_end_time = selected_end.split("T")[1][:5]
            else:
                st.session_state.selected_start_time = None
                st.session_state.selected_end_time = None
            st.session_state.active_view = "data"
            st.session_state.selected_event_id = None
        render_view()

    # Handle eventClick callbacks
    elif cb_type == "eventClick":
        st.session_state.prev_cal_response = big_cal_response
        event_clicked = big_cal_response.get("eventClick", {}).get("event", {})
        event_id = event_clicked.get("id")
        if event_id:
            st.session_state.selected_event_id = event_id
            st.session_state.active_view = "conversation"
            st.session_state.selected_date = None
            render_view()
            
    # Handle eventChange callbacks 
    elif cb_type =="eventChange":
        event = big_cal_response.get("eventChange", {}).get("event", {})
        new_start_date = pd.to_datetime(event['start']).date()
        new_time = pd.to_datetime(event['start']).time()
        ev_type = big_cal_response.get("eventChange", {}).get("event", {}).get("extendedProps").get("type")
        result = modify_reservation(event['id'], str(new_start_date), str(new_time), str(event['title']), ev_type, approximate=True)
        if result.get("success", "") == True:
            st.toast("Reservation changed." if is_gregorian else "تم تعديل الحجز.")
            time.sleep(1)
            st.rerun()
        else:
            st.warning(result.get("message", ""))
        st.session_state.selected_start_time = str(new_start_date)
        st.session_state.selected_event_id = None
        st.session_state.selected_end_time = None

    # st.json(big_cal_response, expanded=True)  # Optional: for debugging
render_cal()

# st_autorefresh(interval=5000)