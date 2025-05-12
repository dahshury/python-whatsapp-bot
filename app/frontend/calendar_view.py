import datetime
import hashlib
import json
import time
import os

import pandas as pd
import streamlit as st
import streamlit_antd_components as sac
from streamlit_calendar import calendar

from . import get_ramadan_dates, is_ramadan, subtract_ramadan_from_normal
from . import format_date_for_display, get_event_time_range, update_date_time_selection
from .whatsapp_client import get_all_reservations, get_all_conversations, parse_date, parse_time, modify_reservation, get_message, find_nearest_time_slot
from .data_view import render_view

def reset_calendar(success, new_start_date):
    time.sleep(3 if success else 5)
    st.session_state.selected_start_date = str(new_start_date)
    st.session_state.selected_event_id = None
    st.session_state.selected_end_time = None
    # Force a rebuild of calendar events on the next render
    st.session_state.pop('calendar_events_hash', None)
    st.rerun()
    
@st.fragment
def render_cal(is_gregorian, free_roam):
    today = datetime.date.today()
    
    # Store free_roam status in session state so other components can access it
    st.session_state['free_roam'] = free_roam
    
    try:
        # Get all reservations at once with future=False to include both future and past
        res_response = get_all_reservations(future=False, include_cancelled=free_roam)
        if not res_response.get("success", False):
            error_msg = res_response.get("message") or get_message("system_error_try_later", ar=not is_gregorian)
            st.error(error_msg)
            st.stop()
        all_reservations = res_response["data"] # Use data from the standardized response
        
        # Split into active and cancelled reservations
        st.session_state.reservations = {}
        st.session_state.cancelled_reservations = {}
        
        # Process reservations based on their type
        for wa_id, customer_reservations in all_reservations.items():
            active_reservations = []
            cancelled = []
            
            for reservation in customer_reservations:
                
                # Only include reservations with future dates in active reservations
                date_str = reservation.get("date", "")
                if date_str:
                    reservation_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
                    # In free_roam mode include all dates, else only future dates
                    if free_roam:
                        if reservation.get("cancelled"):
                            cancelled.append(reservation)
                        else:
                            active_reservations.append(reservation)
                    elif reservation_date >= today and not reservation.get("cancelled", False):
                        active_reservations.append(reservation)
        
            if active_reservations:
                st.session_state.reservations[wa_id] = active_reservations
            if cancelled:
                st.session_state.cancelled_reservations[wa_id] = cancelled
                
        # Store all reservations (both active and cancelled) for name lookups
        st.session_state.all_customer_data = all_reservations
        
        conv_response = get_all_conversations()
        if not conv_response.get("success", False):
            error_msg = conv_response.get("message") or get_message("system_error_try_later", ar=not is_gregorian)
            st.error(error_msg)
            st.stop()
        st.session_state.conversations = conv_response["data"] # Use data from the standardized response
    except Exception as e:
        msg = get_message("system_error_generic", ar=not is_gregorian, error=str(e))
        st.error(msg)
        st.stop()
    
    # Only clear and rebuild the calendar if absolutely necessary
    should_rebuild_calendar = False
    
    # Check if this is the first render or if view type has changed
    if ('calendar_events' not in st.session_state or 
        'calendar_events_hash' not in st.session_state or
        'prev_settings' not in st.session_state or
        st.session_state.get('prev_settings') != (is_gregorian, free_roam)):
        should_rebuild_calendar = True
        st.session_state.prev_settings = (is_gregorian, free_roam)
        
    # Only empty the container if we need to rebuild
    if should_rebuild_calendar:
        st.session_state.calendar_container.empty()
    
    with st.session_state.calendar_container.container():
        mode_names = {
            "timeGridWeek": get_message("calendar_week_grid", ar=not is_gregorian),
            "timelineMonth": get_message("calendar_timeline", ar=not is_gregorian),
            "listMonth": get_message("calendar_list", ar=not is_gregorian),
            "multiMonthYear": get_message("calendar_multi_month", ar=not is_gregorian),
        }
        sac.divider(label='Calendar', icon='calendar4', align='center', color='gray', key="cal_divider")
        # derive view IDs and current index from session state
        view_ids = list(mode_names.keys())
        current_idx = view_ids.index(st.session_state.selected_view_id) if st.session_state.selected_view_id in view_ids else 0
        # render segmented control and update session state
        selected_view_idx = sac.segmented(
            items=[
                sac.SegmentedItem(label=mode_names[view_ids[0]], icon='calendar2-range'),
                sac.SegmentedItem(label=mode_names[view_ids[1]], icon='grid-1x2-fill'),
                sac.SegmentedItem(label=mode_names[view_ids[2]], icon='list'),
                sac.SegmentedItem(label=mode_names[view_ids[3]], icon='calendar2-week')
            ],
            label='',
            align='center',
            bg_color='gray',
            use_container_width=True,
            return_index=True,
            index=current_idx,
            key="view_selector"
        )
        
        # Check if the view selector changed
        if st.session_state.selected_view_idx != selected_view_idx:
            should_rebuild_calendar = True
            st.session_state.selected_view_idx = selected_view_idx
            new_view_id = view_ids[selected_view_idx]
            
            # Update query params if view changed
            if st.session_state.selected_view_id != new_view_id:
                st.session_state.selected_view_id = new_view_id
                st.query_params["view"] = new_view_id
                # No need to rerun here, the calendar component will handle the visual update
                # st.rerun() # Avoid unnecessary rerun if only view changed
                
        # Update session state regardless (needed for initial setup)
        st.session_state.selected_view_id = view_ids[selected_view_idx]
        
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
                        "title": get_message("vacation", ar=not is_gregorian)
                    }
                    vacation_events.append(vacation_event)

        initial_date = st.session_state.selected_start_date if st.session_state.selected_start_date else datetime.date.today().isoformat()
        
        # Get day of week (0-6, where 0 is Sunday, 6 is Saturday)
        initial_dt = datetime.datetime.fromisoformat(initial_date) if isinstance(initial_date, str) else initial_date
        day_of_week = initial_dt.weekday() if isinstance(initial_dt, datetime.datetime) else datetime.datetime.fromisoformat(initial_date).weekday()
        # Convert to Python's weekday (Monday is 0) to calendar weekday (Sunday is 0)
        day_of_week = (day_of_week + 1) % 7

        # Set min and max times based on conditions
        if free_roam:
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

        # Base calendar options
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
            "hiddenDays": [5] if not free_roam else [],
            "slotDuration": "02:00:00",
            "locale": "ar-sa" if not is_gregorian else "en",
            "direction": "rtl" if not is_gregorian else "ltr",
            "firstDay": 6,
            "aspectRatio": 1.35,
            "initialDate": initial_date,
            "initialView": st.session_state.selected_view_id,
            "timeZone": f"{os.getenv('TIMEZONE', 'UTC')}",
        }
        # Localize calendar button text
        if not is_gregorian:
            big_cal_options["buttonText"] = {
                "today": "اليوم",
                "month": "شهر",
                "week": "أسبوع",
                "day": "يوم",
                "multiMonthYear": "عدة أشهر",
            }
        else:
            big_cal_options["buttonText"] = {
                "today": "today",
                "month": "month",
                "week": "week",
                "day": "day",
                "multiMonthYear": "multiMonthYear",
            }
        # Add business hours constraints only when not in free_roam
        if not free_roam:
            big_cal_options.update({
                "businessHours": ramadan_rules + normal_rules,
                "eventConstraint": "businessHours",
                "selectConstraint": "businessHours",
            })
            # Enforce validRange for navigation when not free_roam
            if st.session_state.selected_view_id != "multiMonthYear":
                big_cal_options["validRange"] = {"start": datetime.datetime.now().isoformat()}
        # In free_roam mode, allow full navigation and events
        else:
            # No constraints: remove any potential limiting keys
            for key in ["businessHours", "eventConstraint", "selectConstraint", "validRange"]:
                big_cal_options.pop(key, None)
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
                    "right": None
                }
            })
        else:
            big_cal_options.update({
                "headerToolbar": {
                    "left": "today prev,next",
                    "center": "title",
                    "right": None
                }
            })

        # Only generate calendar events if we need to rebuild the calendar or if they don't exist yet
        if should_rebuild_calendar or 'calendar_events' not in st.session_state:
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
                    except Exception:
                        st.error(get_message("invalid_time", ar=not is_gregorian))
                        st.stop()
                    # Reservation event properties
                    is_past_slot = start_dt < datetime.datetime.now()
                    event = {
                        "id": id,
                        "title": customer_name,
                        "start": start_dt.isoformat(),
                        "end": end_dt.isoformat(),
                        "backgroundColor": "#4caf50" if type == 0 else "#3688d8",
                        "borderColor": "#4caf50" if type == 0 else "#3688d8",
                        "editable": not is_past_slot or free_roam,  # Allow editing past events in free_roam mode
                        "extendedProps": {
                            "type": type,
                            "cancelled": False
                        }
                    }
                    st.session_state.calendar_events.append(event)

            if free_roam:
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
                            except Exception:
                                st.error(get_message("invalid_time", ar=not is_gregorian))
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
                                "borderColor": "#e5e1e0" if type == 0 else "#e5e1e0",
                                "extendedProps": {
                                    "type": type,
                                    "cancelled": True
                                }
                            }
                            st.session_state.calendar_events.append(event)
                        
            if free_roam:
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
                        except Exception:
                            st.error(get_message("invalid_time", ar=not is_gregorian))
                            st.stop()
                            
                        # Create title based on customer name if available
                        title = get_message("conversation", ar=not is_gregorian, name=customer_name if customer_name else id)
                        
                        event = {
                            "id": id,
                            "title": title,
                            "start": start_dt.isoformat(),
                            "end": end_dt.isoformat(),
                            "editable": False,
                            "backgroundColor": "#EDAE49",
                            "borderColor": "#EDAE49",
                            "classNames": ["conversation-event"]
                        }
                        st.session_state.calendar_events.append(event)
            
            # Create a stable hash of the current events for the calendar key
            events_hash = hashlib.md5(json.dumps(st.session_state.calendar_events, sort_keys=True).encode()).hexdigest()
            st.session_state.calendar_events_hash = events_hash
        else:
            # Use the cached hash if available and we don't need to rebuild
            events_hash = st.session_state.calendar_events_hash
            
        # Generate a stable key for the calendar component
        calendar_key = f"big_calendar_{st.session_state.selected_view_id}_{events_hash}"
        
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
                        .fc-event.conversation-event .fc-event-time {
                            display: none;
                        }
                        .fc-toolbar-title {
                            font-size: 2rem;
                        }
                        /* Change cursor to pointer for all calendar events */
                        .fc-event {
                            cursor: pointer !important;
                        }
                        """,
            key=calendar_key,
        )
        
        # Store the current response if it's a meaningful interaction
        current_callback = big_cal_response.get("callback")
        
        # Only update the stored calendar response for meaningful callbacks
        if current_callback in ['dateClick', 'select', 'eventClick']:
            st.session_state.prev_cal_response = big_cal_response
            cb_type = current_callback
        # If we have a previous response and the current one isn't meaningful, use the previous one
        elif st.session_state.prev_cal_response and current_callback not in ['eventChange']:
            cb_type = st.session_state.prev_cal_response.get("callback")
            big_cal_response = st.session_state.prev_cal_response
        else:
            cb_type = current_callback
            
        if cb_type == "dateClick":
            view_type = big_cal_response.get("dateClick", {}).get("view", {}).get("type", "")
            clicked_date = big_cal_response.get("dateClick", {}).get("date", "")
            if clicked_date:
                # Skip past-date selection check in free_roam
                if not free_roam and clicked_date:
                    dt_clicked = pd.to_datetime(clicked_date).to_pydatetime()
                    if dt_clicked.timestamp() < time.time():
                        st.warning(get_message("cannot_select_past", ar=not is_gregorian))
                        return
                if view_type in ["dayGridMonth", "multiMonthYear"]:
                    # Only update date without time
                    update_date_time_selection(clicked_date.split("T")[0])
                elif view_type in ["timeGridWeek", "timeGridDay", "timelineMonth"]:
                    # Update both date and time
                    update_date_time_selection(clicked_date)
                st.session_state.active_view = "data"
                st.session_state.selected_event_id = None
            render_view(is_gregorian, show_title=True)

        elif cb_type == "select":
            selected_start = big_cal_response.get("select", {}).get("start", "")
            selected_end = big_cal_response.get("select", {}).get("end", "")
            if selected_start and selected_end:
                st.session_state.active_view = "data"
                st.session_state.selected_event_id = None
                # Skip past-range selection check in free_roam
                if not free_roam:
                    dt_selected_start = pd.to_datetime(selected_start).to_pydatetime()
                    if dt_selected_start.timestamp() < time.time():
                        st.warning(get_message("cannot_select_past", ar=not is_gregorian))
                        return
                        
                # Update start date/time
                update_date_time_selection(selected_start, is_range=True)
                
                # Update end date/time
                update_date_time_selection(selected_end, is_range=True, is_end=True)
                
            render_view(is_gregorian, show_title=True)

        elif cb_type == "eventClick":
            event_clicked = big_cal_response.get("eventClick", {}).get("event", {})
            event_id = event_clicked.get("id")
            if event_id:
                st.session_state.selected_event_id = event_id
                st.session_state.active_view = "conversation"
                st.session_state.selected_date = None
                render_view(is_gregorian, show_title=True)
                
        elif cb_type =="eventChange":
            event = big_cal_response.get("eventChange", {}).get("event", {})
            new_start_date = pd.to_datetime(event['start']).date()
            new_time = pd.to_datetime(event['start']).time()
            # Format as 12-hour string for backend and frontend lookup
            formatted_time = new_time.strftime("%I:%M %p")
            # Attempt to approximate to nearest available slot via backend endpoint
            nearest_resp = find_nearest_time_slot(str(new_start_date), formatted_time, ar=not is_gregorian)
            if nearest_resp.get("success", False) and 'time_slot' in nearest_resp:
                formatted_time = nearest_resp.get("time_slot")
            ev_type = big_cal_response.get("eventChange", {}).get("event", {}).get("extendedProps").get("type")
            result = modify_reservation(event['id'], str(new_start_date), formatted_time, str(event['title']), ev_type, approximate=True, ar=not is_gregorian)
            if result.get("success", "") == True:
                st.toast(get_message("reservation_changed", ar=not is_gregorian))
                reset_calendar(True, new_start_date)
            else:
                st.error(result.get("message", ""))
                reset_calendar(False, new_start_date)