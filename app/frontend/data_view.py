import datetime
import time

import pandas as pd
import streamlit as st
import streamlit_antd_components as sac
from hijri_converter import Gregorian

from app.frontend import is_ramadan
from app.services.assistant_functions import cancel_reservation, modify_id, modify_reservation, reserve_time_slot
from app.frontend.conversation_view import render_conversation
from app.utils import parse_time

@st.fragment
def render_view(is_gregorian):
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
                                                        default=int("9665"),
                                                        max_value=999999999999,  # Maximum reasonable phone number length
                                                        step=1,
                                                        help="Enter a valid phone number starting with country code (e.g. 966xxxxxxxxx or 1xxxxxxxxxx)" if is_gregorian else "أدخل رقم هاتف صالح يبدأ برمز البلد (مثل 966xxxxxxxxx)",
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
                        time.sleep(5)
                        st.session_state._changes_processed = False
                        st.rerun()
                if deleted > 0:
                    st.success(f"{deleted} Reservations cancelled." if is_gregorian else f"تم الغاء {deleted} حجوزات.")
                    time.sleep(3)
                    # Reset change processing flag
                    st.session_state._changes_processed = False
                    # Bump data editor key to clear widget state and avoid repeated deletes
                    st.session_state.data_editor_key += 1
                    # Invalidate calendar cache to force rebuild of calendar events
                    st.session_state.pop('prev_settings', None)
                    st.session_state.pop('calendar_events_hash', None)
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
                                time.sleep(5)
                                st.session_state._changes_processed = False
                                st.rerun()
                        else:
                            # Adjust time to consider only the hour
                            curr_row['time'] = curr_row['time'].replace(minute=0, second=0, microsecond=0)
                            # Format the time properly to ensure it's in the expected format
                            if isinstance(curr_row['time'], datetime.time):
                                # Format time as HH:MM AM/PM
                                formatted_time = curr_row['time'].strftime("%I:%M %p")
                            else:
                                # If it's already a string, ensure it's in the right format
                                formatted_time = str(curr_row['time']).split(".")[0]  # Remove any milliseconds
                                if ":" in formatted_time and not ("AM" in formatted_time.upper() or "PM" in formatted_time.upper()):
                                    # Convert 24h format to 12h format with AM/PM
                                    try:
                                        dt = datetime.datetime.strptime(formatted_time[:5], "%H:%M")
                                        formatted_time = dt.strftime("%I:%M %p")
                                    except:
                                        # Keep original if parsing fails
                                        pass
                            result = modify_reservation(str(orig_row['id']), str(curr_row['date']), formatted_time, 
                                                      str(curr_row['title']), 0 if curr_row['type'] in ["كشف", "Check-up"] else 1)
                            if result.get("success", "") == True:
                                modified+=1
                            else:
                                st.error(result.get("message", ""))
                                time.sleep(5)
                                st.session_state._changes_processed = False
                                st.rerun()
                if modified ==len(widget_state.get("edited_rows")):
                    st.success(f"{modified} Reservations changed." if is_gregorian else f"تم تعديل {modified} حجوزات.")
                    time.sleep(3)
                    st.session_state._changes_processed = False
                    st.rerun()
            if widget_state.get("added_rows", []):
                added = 0
                for added_row in widget_state.get("added_rows", []):
                    curr_row = edited_df.iloc[-1]
                    # Format the time properly to ensure it's in the expected format
                    if isinstance(curr_row['time'], datetime.time):
                        # Format time as HH:MM AM/PM
                        formatted_time = curr_row['time'].strftime("%I:%M %p")
                    else:
                        # If it's already a string, ensure it's in the right format
                        formatted_time = str(curr_row['time']).split(".")[0]  # Remove any milliseconds
                        if ":" in formatted_time and not ("AM" in formatted_time.upper() or "PM" in formatted_time.upper()):
                            # Convert 24h format to 12h format with AM/PM
                            try:
                                dt = datetime.datetime.strptime(formatted_time[:5], "%H:%M")
                                formatted_time = dt.strftime("%I:%M %p")
                            except:
                                # Keep original if parsing fails
                                pass
                    
                    result = reserve_time_slot(str(curr_row['id']), str(curr_row['title']), str(curr_row['date']), 
                                             formatted_time, 0 if curr_row['type'] in ["كشف", "Check-up"] else 1, 
                                             max_reservations=6, ar=True)
                    if result.get("success", "") == True:
                        added+=1
                    else:
                        st.error(result.get("message", ""))
                        time.sleep(5)
                        st.session_state._changes_processed = False
                        st.rerun()
                if added == len(widget_state.get("added_rows", [])):
                    st.success(f"{added} Reservations added." if is_gregorian else f"تم إضافة {added} حجوزات.")
                    time.sleep(3)
                    st.session_state._changes_processed = False
                    st.rerun()

    elif st.session_state.active_view == "conversation":
        sac.divider(label='Conversation', icon='chat-dots-fill', align='center', color='gray')
        render_conversation(st.session_state.conversations, is_gregorian, st.session_state.reservations) 