import streamlit as st
import json
import datetime
from streamlit_calendar import calendar

# Define the JSON file path (update if needed)
JSON_FILE_PATH = "threads_db.json"

# Load JSON Data from File
try:
    with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    st.error(f"Failed to load JSON file from path: {JSON_FILE_PATH}")
    st.error(str(e))
    st.stop()
    
# Set page configuration to wide layout
st.set_page_config(page_title="Chat Calendar Viewer", layout="wide")

# Inject SB Admin 2 Bootstrap theme via CDN
st.markdown("""
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/startbootstrap-sb-admin-2/4.1.3/css/sb-admin-2.min.css" 
integrity="sha512-5eCE5pI1qGCDL+9Dr2SnuZQOa97LaxSmGm0uI87+1g6PE0FmDFXJ3UypIzj+ewLbt2c8N9PZjFQAzUb1CMzYvg==" 
crossorigin="anonymous">
""", unsafe_allow_html=True)

st.markdown("<h1 style='text-align: center;'>Dr. Amal Saied Appointment Calendar</h1>", unsafe_allow_html=True)

# Calendar mode selector
mode = st.selectbox(
    "Calendar Mode:",
    (
        "daygrid",
        "timegrid",
        "timeline",
        "resource-daygrid",
        "resource-timegrid",
        "resource-timeline",
        "list",
        "multimonth",
    ),
)

# Toggle for Ramadan mode
is_ramadan = st.checkbox("تفعيل مواعيد رمضان", value=False)

st.markdown(
    """
    <style>
    iframe[title="streamlit-calendar"] {
        width: 100% !important;
        height: 100vh !important;
        min-width: 100px;
        min-height: 600px;
    }
    .fc-event:hover {
        cursor: grab;
    }
    .fc-event-past {
        opacity: 0.8;
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
    </style>
    """,
    unsafe_allow_html=True,
)

calendar_options = {
    "editable": True,
    "selectable": True,
    "navLinks": True,
    "weekNumbers": True,
    "buttonIcons": False,
    "nowIndicator": True,
    "dayMaxEvents": True,
    "hiddenDays": [5],  # Hide Fridays
    "slotDuration": "02:00:00",
    "locale": "ar-sa",
    "direction": "rtl",
    "firstDay": 6,  # Start week on Saturday
    "aspectRatio": 2.5,
    "expandRows": True,
    "initialDate": datetime.date.today().isoformat(),
    "initialView": "dayGridMonth",
}

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

# Configure Calendar Options (common settings)
initial_date = datetime.date.today().isoformat()

# Set slotMinTime, slotMaxTime, businessHours, and constraints
if is_ramadan:
    calendar_options["slotMinTime"] = "10:00:00"
    calendar_options["slotMaxTime"] = "16:00:00"
    calendar_options["businessHours"] = [
        {
            "daysOfWeek": [0, 1, 2, 3, 4, 6],  # Sunday to Thursday and Saturday
            "startTime": "10:00",
            "endTime": "16:00",
        }
    ]
else:
    calendar_options["slotMinTime"] = "11:00:00"
    calendar_options["slotMaxTime"] = "22:00:00"
    calendar_options["businessHours"] = [
        {
            "daysOfWeek": [0, 1, 2, 3, 4],  # Sunday to Thursday
            "startTime": "11:00",
            "endTime": "17:00",
        },
        {
            "daysOfWeek": [6],  # Saturday
            "startTime": "17:00",
            "endTime": "22:00",
        }
    ]

# Add constraints
calendar_options["selectConstraint"] = "businessHours"
calendar_options["eventConstraint"] = "businessHours"

# Adjust Calendar Options Based on Selected Mode
if "resource" in mode:
    calendar_resources = [
        {"id": "a", "building": "Building A", "title": "Room A"},
        {"id": "b", "building": "Building A", "title": "Room B"},
        {"id": "c", "building": "Building B", "title": "Room C"},
        {"id": "d", "building": "Building B", "title": "Room D"},
        {"id": "e", "building": "Building C", "title": "Room E"},
        {"id": "f", "building": "Building C", "title": "Room F"},
    ]
    calendar_options["resources"] = calendar_resources
    if mode == "resource-daygrid":
        calendar_options.update({
            "initialDate": initial_date,
            "initialView": "resourceDayGridDay",
            "resourceGroupField": "building",
            "headerToolbar": {
                "left": "today prev,next",
                "center": "title",
                "right": "resourceDayGridDay,resourceDayGridWeek,resourceDayGridMonth",
            },
        })
    elif mode == "resource-timeline":
        calendar_options.update({
            "initialDate": initial_date,
            "initialView": "resourceTimelineDay",
            "resourceGroupField": "building",
            "headerToolbar": {
                "left": "today prev,next",
                "center": "title",
                "right": "resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth",
            },
        })
    elif mode == "resource-timegrid":
        calendar_options.update({
            "initialDate": initial_date,
            "initialView": "resourceTimeGridDay",
            "resourceGroupField": "building",
        })
else:
    if mode == "daygrid":
        calendar_options.update({
            "initialDate": initial_date,
            "initialView": "dayGridMonth",
            "headerToolbar": {
                "left": "today prev,next",
                "center": "title",
                "right": "dayGridDay,dayGridWeek,dayGridMonth",
            },
        })
    elif mode == "timegrid":
        calendar_options.update({
            "initialDate": initial_date,
            "initialView": "timeGridWeek",
        })
    elif mode == "timeline":
        calendar_options.update({
            "initialDate": initial_date,
            "initialView": "timelineMonth",
            "headerToolbar": {
                "left": "today prev,next",
                "center": "title",
                "right": "timelineDay,timelineWeek,timelineMonth",
            },
        })
    elif mode == "list":
        calendar_options.update({
            "initialDate": initial_date,
            "initialView": "listMonth",
        })
    elif mode == "multimonth":
        calendar_options.update({
            "initialView": "multiMonthYear",
        })

# Render the Calendar Component
cal_response = calendar(
    events=calendar_events,
    options=calendar_options,
    key=f"{mode}_{is_ramadan}",
)

st.write("Calendar response:", cal_response)  # (Optional: for debugging)

# Display Conversation When a Calendar Event is Clicked
if cal_response and cal_response.get("callback") == "eventClick":
    event_clicked = cal_response.get("eventClick", {}).get("event", {})
    event_id = event_clicked.get("id")
    if event_id and event_id in data:
        st.title(f"Conversation: {event_id}")
        conversation = data[event_id].get("conversation", [])
        for msg in conversation:
            role = msg.get("role", "user")
            message = msg.get("message", "")
            with st.chat_message(role):
                st.markdown(message)
else:
    st.info("Click on a conversation event in the calendar to view its details.")