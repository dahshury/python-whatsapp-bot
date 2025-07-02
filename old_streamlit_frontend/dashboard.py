from datetime import timedelta
import streamlit as st
import streamlit_antd_components as sac
from streamlit_autorefresh import st_autorefresh
from app.frontend import authenticate
from app.frontend.sidebar import render_sidebar_elements, render_vacation_editor
from app.frontend.calendar_view import render_cal
from app.frontend.statistics_view import render_statistics

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
# Determine default page from query params
default_page = params.get('page', 'calendar')
default_page_index = 0 if str(default_page).lower() == 'calendar' else 1
selected_menu = default_page_index
with st.sidebar:
    user_name = st.session_state.get('name', '')
    # Show menu only for non-secretary users
    if st.session_state.get('authentication_status') and user_name.lower() != 'secretary':
        # Build and display main navigation menu
        is_gregorian_menu = st.session_state.get('is_gregorian', default_gregorian)
        menu_items = [
            sac.MenuItem('Calendar' if is_gregorian_menu else 'التقويم', icon='calendar-month'),
            sac.MenuItem('Statistics' if is_gregorian_menu else 'الإحصائيات', icon='bar-chart'),
        ]
        selected_menu = sac.menu(menu_items, index=default_page_index, return_index=True, open_all=True, key='main_sidebar_menu')
        # Persist page selection in query params
        if selected_menu != default_page_index:
            st.query_params.update({'page': 'calendar' if selected_menu == 0 else 'statistics'})
            st.rerun()
        # Render sidebar elements only for Calendar page
        if selected_menu == 0:
            render_sidebar_elements()
            render_vacation_editor()
    else:
        # For secretary or anonymous users, always show calendar sidebar
        render_sidebar_elements()
        render_vacation_editor()

# =============================================================================
# MAIN APP EXECUTION
# =============================================================================
# Render calendar with toggle states from session state
is_gregorian = st.session_state.get('is_gregorian', params.get("gregorian", "1") == "1")
free_roam = st.session_state.get('free_roam', params.get("free_roam", "0") == "1")

# Auto-refresh and clear calendar cache on refresh
refresh_count = st_autorefresh(interval=350000, key="autorefresh")
if 'last_refresh_count' not in st.session_state or st.session_state.last_refresh_count != refresh_count:
    st.session_state.last_refresh_count = refresh_count
    st.session_state.pop('calendar_events_hash', None)
    st.session_state.pop('calendar_events', None)
    st.session_state.pop('prev_settings', None)
# Render main view based on sidebar selection
if selected_menu == 0:
    render_cal(is_gregorian, free_roam)
else:
    # Render the full statistics dashboard
    render_statistics(is_gregorian)