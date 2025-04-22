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
default_gregorian = params.get("gregorian", "0") == "1"
default_free_roam = params.get("free_roam", "0") == "1"

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
            ],
            label='',
            align='center',
            bg_color='transparent',
            return_index=True,
            index=1 if default_gregorian else 0,
            key="gregorian_selector"
        )
        is_gregorian = True if is_gregorian_idx == 1 else False
        
    with col2:
        free_roam_idx = sac.segmented(
            items=[
                sac.SegmentedItem(label='مقيد', icon='lock'),
                sac.SegmentedItem(label='غير مقيد', icon='unlock'),
            ],
            label='',
            align='center',
            bg_color='transparent',
            return_index=True,
            index=1 if default_free_roam else 0,
            key="free_roam_selector"
        )
        free_roam = True if free_roam_idx == 1 else False
    
    # Add vacation editor as the last element in the sidebar
    st.session_state.is_gregorian = is_gregorian
    render_vacation_editor()
    # Persist toggles with stable API if they changed
    if (
        is_gregorian != default_gregorian
        or free_roam != default_free_roam):
        # Prepare params to update, only include toggles
        updated_params = {}
        if is_gregorian != default_gregorian:
            updated_params["gregorian"] = str(int(is_gregorian))
        if free_roam != default_free_roam:
            updated_params["free_roam"] = str(int(free_roam))
        
        # Use st.query_params.update() which preserves existing params like 'view'
        st.query_params.update(updated_params)
        st.rerun()

# =============================================================================
# MAIN APP EXECUTION
# =============================================================================
# Render calendar with current toggle states
render_cal(is_gregorian, free_roam)
st_autorefresh(interval=350000)