from datetime import timedelta
import streamlit as st
import streamlit_antd_components as sac
from streamlit_autorefresh import st_autorefresh
from app.frontend import authenticate
from app.frontend.sidebar import render_sidebar_elements, render_vacation_editor
from app.frontend.calendar_view import render_cal


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
if "selected_view_idx" not in st.session_state:
    st.session_state.selected_view_idx = 0
if "selected_view_id" not in st.session_state:
    st.session_state.selected_view_id = "dayGridMonth"
if "slot_duration_delta" not in st.session_state:
    st.session_state.slot_duration_delta = timedelta(hours=2)

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
with st.sidebar:
    render_sidebar_elements()
    col1, col2 = st.columns(2)
    
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
    
    # Add vacation editor as the last element in the sidebar
    st.session_state.is_gregorian = is_gregorian
    render_vacation_editor()

# =============================================================================
# CALENDAR MODE & RAMADAN HOURS
# =============================================================================
default_gregorian = st.query_params.get("gregorian", "False") == "True"
default_free_roam = st.query_params.get("free_roam", "False") == "True"
default_show_conversations = st.query_params.get("show_conversations", "False") == "False"
st.query_params.free_roam = str(free_roam)
st.query_params.gregorian = str(is_gregorian)
st.query_params.show_conversations = str(show_conversations)

# =============================================================================
# MAIN APP EXECUTION
# =============================================================================
render_cal(is_gregorian, free_roam, show_conversations, show_cancelled_reservations)
st_autorefresh(interval=350000)