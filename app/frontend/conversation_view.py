import datetime
from zoneinfo import ZoneInfo

import streamlit as st

from app.frontend import convert_time_to_sortable
from app.utils import send_whatsapp_message, append_message
from app.config import config

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

    if st.session_state.selected_event_id in conversations:
        # First create/prepare the options list
        options = []
        for option in conversations:
            # Try to fetch name from active reservations
            name = None
            if option in reservations and isinstance(reservations[option], list) and reservations[option] and reservations[option][0].get('customer_name'):
                name = reservations[option][0]['customer_name']
            # If no active reservation name, check all customer data for past or cancelled reservation names
            if not name and 'all_customer_data' in st.session_state and option in st.session_state.all_customer_data:
                for res in st.session_state.all_customer_data[option]:
                    if isinstance(res, dict) and res.get('customer_name'):
                        name = res['customer_name']
                        break
            if name:
                options.append(f"{option} - {name}")
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

        # Navigation label
        label_text = "Select or write a number..." if is_gregorian else "اختر أو اكتب رقمًا..."
        st.write(label_text)

        # Navigation controls row: arrows and select
        col1, col2, col3 = st.columns([1, 10, 1])
        # Left arrow
        with col1:
            prev_btn = st.button(
                "◀",
                key="prev_conversation",
                help=("Previous" if is_gregorian else "السابق"),
                use_container_width=True
            )
        # Selectbox without label
        with col2:
            selected_event_id = st.selectbox(
                "select a conversation",
                options=options,
                index=index,
                label_visibility="collapsed",
                key=f"conversation_selectbox",
            )
        # Right arrow
        with col3:
            next_btn = st.button(
                "▶",
                key="next_conversation",
                help=("Next" if is_gregorian else "التالي"),
                use_container_width=True
            )

        # Handle navigation button clicks
        if prev_btn and len(options) > 0:
            new_index = (index - 1) % len(options)
            st.session_state.selected_event_id = options[new_index].split(" - ")[0].strip()
            # st.rerun(scope="fragment")

        if next_btn and len(options) > 0:
            new_index = (index + 1) % len(options)
            st.session_state.selected_event_id = options[new_index].split(" - ")[0].strip()
            # st.rerun(scope="fragment")

        # Handle selectbox changes
        if st.session_state.selected_event_id != selected_event_id.split("-")[0].strip():
            st.session_state.selected_event_id = selected_event_id.split("-")[0].strip()
            # st.rerun(scope="fragment")
        
        conversation = conversations[st.session_state.selected_event_id.split(" - ")[0] if " - " in selected_event_id else selected_event_id]
        if conversation and isinstance(conversation, list) and conversation[0].get("role"):
            # Sort the conversation by date and time
            sorted_conversation = sorted(conversation, 
                                         key=lambda x: (x.get("date", ""), 
                                                       convert_time_to_sortable(x.get("time", "00:00:00"))))
            
            for msg in sorted_conversation:
                role = msg.get("role")
                message = msg.get("message")
                raw_timestamp = msg.get("time", None)
                msg_date = msg.get("date", "")
                
                # Convert timestamp to consistent 12-hour format
                if raw_timestamp:
                    try:
                        # Handle either 24-hour format or already 12-hour format
                        if len(raw_timestamp.split(":")) == 3 and "AM" not in raw_timestamp.upper() and "PM" not in raw_timestamp.upper():
                            # 24-hour format with seconds (HH:MM:SS)
                            time_obj = datetime.datetime.strptime(raw_timestamp, "%H:%M:%S")
                        elif len(raw_timestamp.split(":")) == 2 and "AM" not in raw_timestamp.upper() and "PM" not in raw_timestamp.upper():
                            # 24-hour format without seconds (HH:MM)
                            time_obj = datetime.datetime.strptime(raw_timestamp, "%H:%M")
                        else:
                            # Already in 12-hour format
                            time_obj = datetime.datetime.strptime(raw_timestamp, "%I:%M %p")
                        
                        # Format to 12-hour for display
                        formatted_timestamp = time_obj.strftime("%I:%M %p")
                    except Exception as e:
                        # If parse fails, use as is
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
            
            # Determine if chat input should be disabled due to 24h lockout
            tz_str = config.get("TIMEZONE", "UTC")
            tz = ZoneInfo(tz_str)
            now = datetime.datetime.now(tz)
            user_msgs = [msg for msg in sorted_conversation if msg.get("role") == "user"]
            if user_msgs:
                last_user = user_msgs[-1]
                try:
                    last_date = datetime.date.fromisoformat(last_user["date"])
                    time_str = last_user.get("time", "")
                    # Parse time in various formats (HHMMSS or HH:MM:SS or HH:MM)
                    if len(time_str) == 6 and time_str.isdigit():
                        t = datetime.datetime.strptime(time_str, "%H%M%S").time()
                    else:
                        parts = time_str.split(":")
                        if len(parts) == 3:
                            t = datetime.datetime.strptime(time_str, "%H:%M:%S").time()
                        elif len(parts) == 2:
                            t = datetime.datetime.strptime(time_str, "%H:%M").time()
                        else:
                            raise ValueError("Invalid time format")
                    last_dt = datetime.datetime(last_date.year, last_date.month, last_date.day, t.hour, t.minute, t.second, tzinfo=tz)
                    disabled = (now - last_dt).total_seconds() > 86400
                except:
                    disabled = False
            else:
                disabled = False
            prompt = st.chat_input(
                "اكتب ردًا..." if not is_gregorian else "Reply...",
                disabled=disabled,
                key=f"chat_input_{st.session_state.selected_event_id}",
            )

            if prompt:
                datetime_obj = datetime.datetime.now()
                curr_date = datetime_obj.date().isoformat()
                curr_time = datetime_obj.strftime("%H:%M:%S")  # Store in 24-hour format with seconds
                display_time = datetime_obj.strftime("%I:%M %p")  # For display in UI
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