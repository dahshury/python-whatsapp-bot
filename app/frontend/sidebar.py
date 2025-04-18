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
    # Header row for columns: index, start date, end date
    col0_lbl, col1_lbl, col2_lbl, col3_lbl = st.columns([1, 4, 4, 1])
    with col1_lbl:
        st.write('Start Date' if st.session_state.get('is_gregorian', False) else 'تاريخ البداية')
    with col2_lbl:
        st.write('End Date' if st.session_state.get('is_gregorian', False) else 'تاريخ النهاية')
    for i, period in enumerate(st.session_state.vacation_periods):
        col0, col1, col2, col3 = st.columns([1, 4, 4, 1])
        # Number icon button
        with col0:
            sac.buttons(
                [sac.ButtonsItem(icon=sac.BsIcon(name=f"{i+1}-square-fill", size='md', color="gray"))],
                align='center',
                variant='text',
                index=None,
                key=f"num_{i}"
            )
        # Date pickers with collapsed labels
        with col1:
            new_start = st.date_input(
                "Start Date",
                value=period['start'],
                key=f"start_{i}",
                min_value=date.today(),
                format="DD/MM/YYYY",
                label_visibility="collapsed"
            )
        with col2:
            new_end = st.date_input(
                "End Date",
                value=period['end'],
                key=f"end_{i}",
                min_value=date.today(),
                format="DD/MM/YYYY",
                label_visibility="collapsed"
            )
        # Remove button using st.button
        with col3:
            if st.button(
                "🗑",
                key=f"remove_{i}",
                help=("Remove this vacation period" if st.session_state.get('is_gregorian', False) else "حذف فترة الإجازة"),
                use_container_width=True
            ):
                st.session_state.vacation_periods.pop(i)
                update_vacation_env()
                st.rerun()
    
    # Add new vacation period button using st.button
    col0_add, col1_add, col2_add, col3_add = st.columns([1, 4, 4, 1])
    with col3_add:
        if st.button(
            "✚",
            key="add_period",
            help=("Add new vacation period" if st.session_state.get('is_gregorian', False) else "إضافة فترة إجازة جديدة"),
            use_container_width=True
        ):
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