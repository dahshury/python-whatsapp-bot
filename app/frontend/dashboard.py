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
    # Read initial view from query params, default to 'timeGridWeek'
    default_view_id = st.query_params.get("view", "timeGridWeek")
    st.session_state.selected_view_id = default_view_id
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
# Read URL params via stable API
params = st.query_params
default_gregorian = params.get("gregorian", "0") == "1"  # Default is hijri
default_free_roam = params.get("free_roam", "0") == "1"

# =============================================================================
# SIDE BAR (Prayer Times, Clock)
# =============================================================================
with st.sidebar:
    render_sidebar_elements()
    # Add vacation editor as the last element in the sidebar
    render_vacation_editor()

# =============================================================================
# MAIN APP EXECUTION
# =============================================================================
# Render calendar with toggle states from session state
is_gregorian = st.session_state.get('is_gregorian', params.get("gregorian", "1") == "1")
free_roam = st.session_state.get('free_roam', params.get("free_roam", "0") == "1")
render_cal(is_gregorian, free_roam)
st_autorefresh(interval=350000)