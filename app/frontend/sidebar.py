import streamlit as st
import streamlit_antd_components as sac
from datetime import datetime, timedelta, date
import os
from dotenv import load_dotenv, set_key

@st.fragment
def render_sidebar_elements():
    # Prayer Time section
    sac.divider(label='مواقيت الصلاة' if not st.session_state.get('is_gregorian', False) else 'Prayer Time', icon='person-arms-up', align='center', color='gray')
    st.components.v1.iframe("https://offline.tawkit.net/", height=450)
    
    # Options section divider
    sac.divider(label='الإعدادات'if not  st.session_state.get('is_gregorian', False) else 'Options', icon='toggles2', align='center', color='gray')
    
    # Initialize vacation periods (this is done early but will be displayed separately)
    initialize_vacation_periods()

@st.fragment
def render_vacation_editor():
    """Renders the vacation period editor UI at the end of the sidebar"""
    # Ensure vacation periods are initialized
    initialize_vacation_periods()
    
    # Remove expired vacation periods
    today = date.today()
    original_periods = st.session_state.vacation_periods.copy()
    st.session_state.vacation_periods = [p for p in st.session_state.vacation_periods if p['end'] >= today]
    if len(st.session_state.vacation_periods) != len(original_periods):
        update_vacation_env()
    
    # Vacation Periods Editor header
    sac.divider(label='فترات الإجازة' if not st.session_state.get('is_gregorian', False) else 'Vacation Periods', 
                icon='airplane', align='center', color='gray')    
    # Display vacation periods with date pickers
    for i, period in enumerate(st.session_state.vacation_periods):
        with st.container():
            col1, col2, col3 = st.columns([4, 4, 1])
            with col1:
                new_start = st.date_input("تاريخ البداية" if not st.session_state.get('is_gregorian', False) else "Start Date", 
                                         value=period['start'], key=f"start_{i}", min_value=date.today(), format="DD/MM/YYYY")
            with col2:
                new_end = st.date_input("تاريخ النهاية" if not st.session_state.get('is_gregorian', False) else "End Date", 
                                       value=period['end'], key=f"end_{i}", min_value=date.today(), format="DD/MM/YYYY")
            with col3:
                if st.button("✗", key=f"remove_{i}", help="Remove this vacation period"):
                    st.session_state.vacation_periods.pop(i)
                    update_vacation_env()
                    st.rerun()
            
            # Update session state if changed
            if new_start != period['start'] or new_end != period['end']:
                if new_start <= new_end:
                    st.session_state.vacation_periods[i]['start'] = new_start
                    st.session_state.vacation_periods[i]['end'] = new_end
                    update_vacation_env()
                else:
                    st.warning("يجب أن يكون تاريخ النهاية بعد تاريخ البداية." if not st.session_state.get('is_gregorian', False) 
                              else "End date must be after start date.")
    
    # Add new vacation period with + icon
    col1, col2, col3 = st.columns([4, 4, 1])
    with col3:
        if st.button("✚", key="add_period", help="Add new vacation period"):
            last_end = st.session_state.vacation_periods[-1]['end'] if st.session_state.vacation_periods else date.today()
            new_start = last_end + timedelta(days=1)
            new_end = new_start + timedelta(days=7)
            st.session_state.vacation_periods.append({'start': new_start, 'end': new_end})
            update_vacation_env()
            st.rerun()

def initialize_vacation_periods():
    """Initialize vacation periods from environment variables"""
    if 'vacation_periods' not in st.session_state:
        # Load initial vacation periods from environment variables
        load_dotenv()
        start_dates = os.getenv('VACATION_START_DATES', '').split(',') if os.getenv('VACATION_START_DATES') else []
        durations = os.getenv('VACATION_DURATIONS', '').split(',') if os.getenv('VACATION_DURATIONS') else []
        st.session_state.vacation_periods = []
        for i, start in enumerate(start_dates):
            if start and i < len(durations) and durations[i]:
                try:
                    start_date = datetime.strptime(start.strip(), '%Y-%m-%d').date()
                    duration = int(durations[i].strip())
                    end_date = start_date + timedelta(days=duration)
                    st.session_state.vacation_periods.append({
                        'start': start_date,
                        'end': end_date
                    })
                except (ValueError, IndexError):
                    continue

# Function to update environment variables
def update_vacation_env():
    start_dates = ','.join([p['start'].strftime('%Y-%m-%d') for p in st.session_state.vacation_periods])
    durations = ','.join([str((p['end'] - p['start']).days) for p in st.session_state.vacation_periods])
    
    # Update .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
    set_key(env_path, 'VACATION_START_DATES', start_dates)
    set_key(env_path, 'VACATION_DURATIONS', durations)
    
    # Update in-memory environment variables
    os.environ['VACATION_START_DATES'] = start_dates
    os.environ['VACATION_DURATIONS'] = durations
    
    st.toast("تم تحديث فترات الإجازة بنجاح!" if not st.session_state.get('is_gregorian', True) 
            else "Vacation periods updated successfully!", icon="✅") 