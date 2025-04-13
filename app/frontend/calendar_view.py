import datetime
import hashlib
import json
import time

import pandas as pd
import streamlit as st
import streamlit_antd_components as sac
from streamlit_calendar import calendar

from app.frontend import get_ramadan_dates, is_ramadan, subtract_ramadan_from_normal
from app.services.assistant_functions import parse_date, parse_time, modify_reservation
from app.utils import get_all_reservations, get_all_conversations
from app.frontend.data_view import render_view

@st.fragment
def render_cal(is_gregorian, free_roam, show_conversations, show_cancelled_reservations):
    try:
        # Get all reservations at once with future=False to include both future and past
        all_reservations = get_all_reservations(future=False)
        
        # Split into active and cancelled reservations
        st.session_state.reservations = {}
        st.session_state.cancelled_reservations = {}
        
        # Process reservations based on their type
        for wa_id, customer_reservations in all_reservations.items():
            active_reservations = []
            cancelled = []
            
            for reservation in customer_reservations:
                if isinstance(reservation, dict):
                    if reservation.get("cancelled", False):
                        cancelled.append(reservation)
                    else:
                        # Only include reservations with future dates in active reservations
                        date_str = reservation.get("date", "")
                        if date_str:
                            reservation_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
                            today = datetime.date.today()
                            if reservation_date >= today:
                                active_reservations.append(reservation)
            
            if active_reservations:
                st.session_state.reservations[wa_id] = active_reservations
            if cancelled and show_cancelled_reservations:
                st.session_state.cancelled_reservations[wa_id] = cancelled
                
        # Store all reservations (both active and cancelled) for name lookups
        st.session_state.all_customer_data = all_reservations
        
        st.session_state.conversations = get_all_conversations(recent='month')
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
            return_index=True,
            index=st.session_state.selected_view_idx if st.session_state.selected_view_idx else 0,
            on_change=lambda: st.session_state.update({"selected_view_idx": selected_view_idx}),
            key="view_selector"
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
                "startTime": "16:00:00",
                "endTime": "22:00:00",
                "startRecur": "2022-01-01",
                "endRecur": "2031-12-31",
            },
        ]

        normal_rules = subtract_ramadan_from_normal(normal_rules, ramadan_rules)

        # Add vacation periods as disabled dates in the calendar
        vacation_rules = []
        vacation_events = []
        if 'vacation_periods' in st.session_state:
            for period in st.session_state.vacation_periods:
                start_date = period.get('start')
                end_date = period.get('end')
                
                if start_date and end_date:
                    # Instead of using business hours, create background events for vacation periods
                    vacation_event = {
                        "start": start_date.isoformat(),
                        "end": (end_date + datetime.timedelta(days=1)).isoformat(),  # Add a day to include the end date
                        "display": "background",
                        "color": "#ffcccb",  # Light red background
                        "rendering": "background",
                        "overlap": False,
                        "editable": False,
                        "title": "إجازة" if not is_gregorian else "Vacation"
                    }
                    vacation_events.append(vacation_event)

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
            slot_min_time = "16:00:00"
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

        # Add vacation events first so they appear as background
        if not free_roam:
            st.session_state.calendar_events.extend(vacation_events)

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
                    start_dt = datetime.datetime.strptime(f"{parse_date(date_str)}T{parse_time(time_str, to_24h=True)}", "%Y-%m-%dT%H:%M")
                    
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
                            start_dt = datetime.datetime.strptime(f"{parse_date(date_str)}T{parse_time(time_str, to_24h=True)}", "%Y-%m-%dT%H:%M")
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
                    # Check if there's a reservation for this ID (active or cancelled)
                    customer_name = None
                    
                    # First check in active reservations
                    if id in st.session_state.reservations:
                        for reservation in st.session_state.reservations[id]:
                            if reservation.get("customer_name"):
                                customer_name = reservation.get("customer_name")
                                break
                                
                    # If not found, check in cancelled reservations
                    if not customer_name and id in st.session_state.all_customer_data:
                        for reservation in st.session_state.all_customer_data[id]:
                            if reservation.get("customer_name"):
                                customer_name = reservation.get("customer_name")
                                break
                    
                    date_str = conversation[-1].get("date", "")
                    if not date_str:
                        continue
                    time_str = conversation[-1].get("time")
                    try:
                        start_dt = datetime.datetime.strptime(f"{parse_date(date_str)}T{parse_time(time_str, to_24h=True)}", "%Y-%m-%dT%H:%M")
                        end_dt = start_dt + st.session_state.slot_duration_delta / num_reservations_per_slot
                    except ValueError as e:
                        st.error(f"incorrect time format found, {e}")
                        st.stop()
                        
                    # Create title based on customer name if available
                    title = f"محادثة: {customer_name if customer_name else id}" if not is_gregorian else f"Conversation: {customer_name if customer_name else id}"
                    
                    event = {
                        "id": id,
                        "title": title,
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
            render_view(is_gregorian)

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
            render_view(is_gregorian)

        elif cb_type == "eventClick":
            st.session_state.prev_cal_response = big_cal_response
            event_clicked = big_cal_response.get("eventClick", {}).get("event", {})
            event_id = event_clicked.get("id")
            if event_id:
                st.session_state.selected_event_id = event_id
                st.session_state.active_view = "conversation"
                st.session_state.selected_date = None
                st.session_state.data_editor_key +=1
                render_view(is_gregorian)
                
        elif cb_type =="eventChange":
            event = big_cal_response.get("eventChange", {}).get("event", {})
            new_start_date = pd.to_datetime(event['start']).date()
            new_time = pd.to_datetime(event['start']).time()
            # Format the time properly as a string in HH:MM format
            formatted_time = new_time.strftime("%H:%M")
            ev_type = big_cal_response.get("eventChange", {}).get("event", {}).get("extendedProps").get("type")
            result = modify_reservation(event['id'], str(new_start_date), formatted_time, str(event['title']), ev_type, approximate=True, ar=True)
            if result.get("success", "") == True:
                st.toast("Reservation changed." if is_gregorian else "تم تعديل الحجز.")
                time.sleep(5)
                st.session_state.selected_start_time = str(new_start_date)
                st.session_state.selected_event_id = None
                st.session_state.selected_end_time = None
                st.rerun(scope='fragment')
            else:
                st.warning(result.get("message", "")) 