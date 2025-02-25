import streamlit as st
import json
import datetime
import pandas as pd
import os
from streamlit_calendar import calendar
from st_aggrid import AgGrid, GridOptionsBuilder
import streamlit.components.v1 as components
from app.frontend import bootstrap_hijri_datepicker, load_html
from streamlit_option_menu import option_menu

# =============================================================================
# SESSION STATE INITIALIZATION
# =============================================================================
if "active_view" not in st.session_state:
    st.session_state.active_view = "calendar"  # "calendar" or "conversation"
if "selected_date" not in st.session_state:
    st.session_state.selected_date = None
if "selected_event_id" not in st.session_state:
    st.session_state.selected_event_id = None
if "grid_data" not in st.session_state:
    st.session_state.grid_data = None
if "last_selected_date" not in st.session_state:
    st.session_state.last_selected_date = None
if "chat_conversations" not in st.session_state:
    st.session_state.chat_conversations = {}

# =============================================================================
# LOAD JSON DATA
# =============================================================================
JSON_FILE_PATH = "threads_db.json"
try:
    with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    st.error("فشل تحميل ملف JSON")
    st.stop()

# =============================================================================
# PAGE CONFIGURATION & HEADER
# =============================================================================
st.set_page_config(page_title="Chat Calendar Viewer", layout="wide")
st.markdown("<h1 style='text-align: center;'>تقويم مواعيد د.أمل سعيد</h1>", unsafe_allow_html=True)

selected_date = bootstrap_hijri_datepicker(default_date="01-01-2021", height=400, key="bs_datepicker")
if selected_date is not None:
    st.write("الموعد المختار:", selected_date)
else:
    st.write("اختر موعدا...")

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

        /* Big calendar styling */
        iframe[title="streamlit-calendar"] {
            width: 100% !important;
            height: 100vh !important;
            min-width: 100px;
            min-height: 700px;
        }
        .fc-event:hover { cursor: grab; }
        .fc-event-past { opacity: 0.8; }
        .fc-event-time { font-style: italic; }
        .fc-event-title { font-weight: 700; }
        .fc-toolbar-title { font-size: 2rem; }
        html, body, [class*="css"] { direction: rtl; text-align: right; }
        .main .block-container { direction: rtl; }
    </style>
    """,
    unsafe_allow_html=True,
)

# =============================================================================
# SIDE BAR (Prayer Times, Clock)
# =============================================================================
clock_html = """
<script src="https://cdn.logwork.com/widget/clock.js"></script>
<a href="https://logwork.com/clock-widget/" class="clock-time" data-style="default-numeral" data-size="280" data-timezone="Asia/Riyadh">Current time in Makkah, Saudi Arabia</a>
"""
with st.sidebar:
    components.html(clock_html, height=290, width=287)
st.sidebar.markdown(
    """
    <iframe src="https://timesprayer.com/widgets.php?frame=2&amp;lang=en&amp;name=salt&amp;fcolor=869D96&amp;tcolor=587776&amp;frcolor=323232" 
            style="border: none; overflow: hidden; width: 100%; height: 227px;"></iframe>
    """,
    unsafe_allow_html=True,
)

# =============================================================================
# CALENDAR VIEW SELECTION USING OPTION MENU
# =============================================================================
# Define view IDs mapped to display labels (with emojis)
mode_names = {
    "dayGridMonth": "شبكة الأيام",
    "timeGridWeek": "شبكة الوقت",
    "timelineMonth": "الجدول الزمني",
    "listMonth": "القائمة",
    "multiMonthYear": "عدة أشهر"
}

# Create a horizontal option menu for view selection.
selected_view_label = option_menu(
    menu_title=None,  # no title for horizontal layout
    options=list(mode_names.values()),
    icons=["bi-grid-3x3-gap-fill", "bi-calendar2-range", "bi-grid-1x2-fill", "list", "bi-calendar2-week", "bi-menu-down", "bi-list-columns", "bi-grid-3x2-gap"],
    menu_icon="cast",
    default_index=0,
    orientation="horizontal"
)

# Reverse mapping: from label back to view ID.
reverse_mode_names = {v: k for k, v in mode_names.items()}
selected_view_id = reverse_mode_names.get(selected_view_label, "dayGridMonth")

# =============================================================================
# CALENDAR MODE & RAMADAN TOGGLE
# =============================================================================
# Retrieve the default value for ramadan from the query params.
# If "ramadan" isn't set, default to "False".
default_ramadan = st.query_params.get("ramadan", "False") == "True"
# If "gregorian" isn't set, default to "False".
default_gregorian = st.query_params.get("gregorian", "False") == "True"

# Create the checkbox with the default value from the URL.
is_ramadan = st.checkbox("تفعيل مواعيد رمضان", value=default_ramadan, key="ramadan_toggle")
is_gregorian = st.checkbox("تفعيل التاريخ الميلادي", value=default_gregorian, key="gregorian_toggle")

# Update the query parameter to reflect the current state.
# This will add/update the URL parameter ?ramadan=True or ?ramadan=False
st.query_params.ramadan = str(is_ramadan)
# This will add/update the URL parameter ?gregorian=True or ?gregorian=False
st.query_params.gregorian = str(is_gregorian)

# =============================================================================
# BIG CALENDAR OPTIONS & RENDERING
# =============================================================================
initial_date = datetime.date.today().isoformat()
# Define common options for the calendar
big_cal_options = {
    "editable": True,
    "selectable": True,
    "navLinks": True,
    "weekNumbers": False,
    "buttonIcons": True,
    "nowIndicator": True,
    "dayMaxEvents": False,
    "allDaySlot": False,
    "hiddenDays": [5],
    "slotDuration": "02:00:00",
    "locale": "ar-sa" if not is_gregorian else "en",
    "direction": "rtl"  if not is_gregorian else "ltr",
    "firstDay": 6,
    "aspectRatio": 4,
    "expandRows": True,
    "initialDate": initial_date,
    "initialView": selected_view_id,
    "timeZone": "Asia/Riyadh",
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

# Define headerToolbar based on selected view
if selected_view_id in ["dayGridMonth", "timeGridWeek", "timeGridDay"]:
    # For grid views, show buttons for day, week, and month grid views, plus other main views
    big_cal_options.update({
        "headerToolbar": {
            "left": "today prev,next",
            "center": "title",
            "right": "timeGridDay,timeGridWeek,dayGridMonth"
        }
    })
elif selected_view_id == "timelineMonth":
    # For timeline view, show timeline-related buttons and other main views
    big_cal_options.update({
        "headerToolbar": {
            "left": "today prev,next",
            "center": "title",
            "right": ",timeGridWeek, dayGridMonth"
        }
    })
elif selected_view_id == "listMonth":
    # For list view, show list button and other main views
    big_cal_options.update({
        "headerToolbar": {
            "left": "today prev,next",
            "center": "title",
            "right": "timeGridWeek, dayGridMonth"
        }
    })
elif selected_view_id == "multiMonthYear":
    # For multi-month view, show multi-month button and other main views
    big_cal_options.update({
        "headerToolbar": {
            "left": "today prev,next",
            "center": "title",
            "right": "dayGridMonth,timeGridWeek"
        }
    })
else:
    # Default headerToolbar for any unrecognized views
    big_cal_options.update({
        "headerToolbar": {
            "left": "today prev,next",
            "center": "title",
            "right": "dayGridMonth,timeGridWeek,timeGridDay,listMonth"
        }
    })

if is_ramadan:
    big_cal_options["slotMinTime"] = "10:00:00"
    big_cal_options["slotMaxTime"] = "16:00:00"
    big_cal_options["businessHours"] = [{
        "daysOfWeek": [0, 1, 2, 3, 4, 6],
        "startTime": "10:00",
        "endTime": "16:00",
    }]
else:
    big_cal_options["slotMinTime"] = "11:00:00"
    big_cal_options["slotMaxTime"] = "22:00:00"
    big_cal_options["businessHours"] = [
        {"daysOfWeek": [0, 1, 2, 3, 4], "startTime": "11:00", "endTime": "17:00"},
        {"daysOfWeek": [6], "startTime": "17:00", "endTime": "22:00"}
    ]
big_cal_options["selectConstraint"] = "businessHours"
big_cal_options["eventConstraint"] = "businessHours"

# Create Calendar Events from JSON Data
calendar_events = []
for conv_key, conv_data in data.items():
    conversation = conv_data.get("conversation", [])
    if not conversation:
        continue
    first_msg = conversation[0]
    date_str = first_msg.get("date")
    time_str = first_msg.get("time", "00:00")
    if not date_str:
        continue
    try:
        start_dt = datetime.datetime.strptime(f"{date_str}T{time_str}", "%Y-%m-%dT%H:%M")
    except ValueError:
        continue
    end_dt = start_dt + datetime.timedelta(hours=1)
    # Extract phone number without country code
    if conv_key.startswith("966"):
        phone_number = "0" + conv_key[3:]
    elif conv_key.startswith("20"):
        phone_number = "0" + conv_key[2:]
    else:
        phone_number = conv_key  # Default to original if no known country code

    event = {
        "id": conv_key,
        "title": f"محادثة {phone_number}",
        "start": start_dt.isoformat(),
        "end": end_dt.isoformat(),
        "editable": True,
    }
    calendar_events.append(event)

# Render the big calendar
big_cal_response = calendar(
    events=calendar_events,
    options=big_cal_options,
    key=f"big_calendar_{selected_view_id}_{is_ramadan}",
)

st.write("Calendar response:", big_cal_response)  # Optional: for debugging

# =============================================================================
# PROCESS CALLBACKS FROM THE BIG CALENDAR
# =============================================================================
if big_cal_response:
    cb_type = big_cal_response.get("callback")
    
    if cb_type == "dateClick":
        view_type = big_cal_response.get("dateClick", {}).get("view", {}).get("type", {})
        if view_type == "timeGridWeek":
            clicked_date = big_cal_response.get("dateClick", {}).get("date")
            if clicked_date:
                st.session_state.selected_date = clicked_date.split("T")[0]
                st.session_state.selected_event_id = None
                st.session_state.active_view = "calendar"
    elif cb_type == "select":
        selected_start = big_cal_response.get("select", {}).get("start")
        selected_end = big_cal_response.get("select", {}).get("end")
        if selected_start and selected_end:
            st.session_state.selected_date = selected_start.split("T")[0]
            st.session_state.selected_event_id = None
            st.session_state.active_view = "calendar"
    elif cb_type == "eventClick":
        event_clicked = big_cal_response.get("eventClick", {}).get("event", {})
        event_id = event_clicked.get("id")
        if event_id:
            st.session_state.selected_event_id = event_id
            st.session_state.selected_date = None
            st.session_state.active_view = "conversation"  # automatically switch

st.markdown("---")

# =============================================================================
# MAIN VIEW RENDERING (CALENDAR VIEW OR CONVERSATION VIEW)
# =============================================================================
if st.session_state.active_view == "calendar":
    st.markdown("### تقويم الأحداث")
    if st.session_state.selected_date:
        sel_date = st.session_state.selected_date
        filtered = [e for e in calendar_events if e.get("start", "").split("T")[0] == sel_date]
        if filtered:
            df = pd.DataFrame(filtered)
            df["date"] = df["start"].apply(lambda s: s.split("T")[0])
            df["time"] = df["start"].apply(lambda s: s.split("T")[1][:5])
            df.rename(columns={"title": "name"}, inplace=True)
            df["deleted"] = False  # flag field
            df = df[["id", "name", "date", "time", "deleted"]]
            if st.session_state.last_selected_date != sel_date or st.session_state.grid_data is None:
                st.session_state.grid_data = df.copy()
                st.session_state.last_selected_date = sel_date


            gb = GridOptionsBuilder.from_dataframe(st.session_state.grid_data)
            gb.configure_default_column(editable=False, resizable=True, sortable=True, filter=True)
            gb.configure_column("name", headerName="Name", editable=False)
            gb.configure_column("date", headerName="Hijri Date", editable=False)
            gb.configure_column("time", editable=True, cellEditor="agSelectCellEditor",
                                cellEditorParams={"values": ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]})
            gb.configure_column("deleted", headerName="Delete", editable=False, width=100)
            grid_opts = gb.build()

            grid_response = AgGrid(
                st.session_state.grid_data,
                gridOptions=grid_opts,
                height=400,
                fit_columns_on_grid_load=True,
                allow_unsafe_jscode=True,
                key=f"grid_{sel_date}"
            )
        else:
            st.info(f"لا توجد أحداث بتاريخ {st.session_state.selected_date}.")
    else:
        st.info("انقر على تاريخ في التقويم لعرض الأحداث.")
else:
    if st.session_state.selected_event_id:
        ev_id = st.session_state.selected_event_id
        if ev_id in data:
            st.markdown("### اختر المحادثة")
            selected_event_id = st.selectbox("",
                label_visibility="False",
                options=list(data.keys()),
                format_func=lambda x: f"المحادثة: {x}",
                index=list(data.keys()).index(ev_id) if ev_id in data else 0
            )
            if selected_event_id:
                ev_id = selected_event_id
            conversation = data[ev_id].get("conversation", [])
            for msg in conversation:
                role = msg.get("role", "user")
                message = msg.get("message", "")
                with st.chat_message(role):
                    st.markdown(message)
            if ev_id not in st.session_state.chat_conversations:
                st.session_state.chat_conversations[ev_id] = []
            prompt = st.chat_input("اكتب ردًا...", key=f"chat_input_{ev_id}")
            if prompt:
                st.chat_message("assistant2").markdown(prompt)
                st.session_state.chat_conversations[ev_id].append({"role": "assistant2", "content": prompt})
        else:
            st.warning("لم يتم العثور على بيانات المحادثة لهذا الحدث.")
    else:
        st.info("انقر على حدث في التقويم لعرض تفاصيل المحادثة.")
