import streamlit as st
import streamlit_antd_components as sac
from datetime import datetime, timedelta, date
import os
from dotenv import load_dotenv, set_key
import logging

@st.fragment
def render_sidebar_elements():
    # Prayer Time section
    sac.divider(label='مواقيت الصلاة' if not st.session_state.get('is_gregorian', False) else 'Prayer Time', icon='person-arms-up', align='center', color='gray')
    with st.container(border=True):
        st.components.v1.iframe("https://offline.tawkit.net/", height=450)
    
    # Options section divider
    sac.divider(label='الإعدادات'if not  st.session_state.get('is_gregorian', False) else 'Options', icon='toggles2', align='center', color='gray')
    
    # Both toggles in one container, side by side
    with st.container(border=True):
        # Get default values from query parameters
        params = st.query_params
        # Default should be hijri (is_gregorian=False)
        default_gregorian = params.get("gregorian", "0") == "1"
        default_free_roam = params.get("free_roam", "0") == "1"
        
        # Create two columns
        col1, col2 = st.columns(2)
        
        # Calendar type toggle (is_gregorian) in left column
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
            st.session_state.is_gregorian = is_gregorian
        
        # View Mode Toggle (free_roam) in right column
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
            st.session_state.free_roam = free_roam
        
        # Persist toggles with stable API if they changed
        if (is_gregorian != default_gregorian or free_roam != default_free_roam):
            # Prepare params to update, only include toggles
            updated_params = {}
            if is_gregorian != default_gregorian:
                updated_params["gregorian"] = str(int(is_gregorian))
            if free_roam != default_free_roam:
                updated_params["free_roam"] = str(int(free_roam))
            
            # Use st.query_params.update() which preserves existing params like 'view'
            st.query_params.update(updated_params)
            st.rerun()
    
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
    with st.container(border=True):
        for i, period in enumerate(st.session_state.vacation_periods):
            col0, col1, col2 = st.columns([1, 8, 1])
            # Number icon button
            with col0:
                sac.buttons(
                    [sac.ButtonsItem(icon=sac.BsIcon(name=f"{i+1}-square-fill", size='md', color="gray"))],
                    align='center',
                    variant='text',
                    index=None,
                    key=f"num_{i}"
                )
            # Date range picker
            with col1:
                current_day = date.today()
                
                # Always show the original dates from .env file without manipulation
                date_range = st.date_input(
                    "Vacation Period",
                    value=(period['start'], period['end']),
                    key=f"period_{i}",
                    format="DD/MM/YYYY",
                    label_visibility="collapsed",
                    help="Select vacation period dates" if st.session_state.get('is_gregorian', False) else "اختر تواريخ فترة الإجازة"
                )
                
                # Handle date changes with validation
                if isinstance(date_range, tuple) and len(date_range) == 2:
                    new_start, new_end = date_range
                    
                    # Validate that dates are not in the past (for new selections)
                    if new_start != period['start'] and new_start < current_day:
                        st.error("Cannot set vacation start date in the past" if st.session_state.get('is_gregorian', False) else "لا يمكن تحديد تاريخ بداية الإجازة في الماضي")
                    elif new_end != period['end'] and new_end < current_day:
                        st.error("Cannot set vacation end date in the past" if st.session_state.get('is_gregorian', False) else "لا يمكن تحديد تاريخ نهاية الإجازة في الماضي")
                    elif new_start > new_end:
                        st.error("Start date cannot be after end date" if st.session_state.get('is_gregorian', False) else "تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية")
                    else:
                        # Valid dates - update only if there are actual changes
                        if new_start != period['start'] or new_end != period['end']:
                            old_start, old_end = period['start'], period['end']
                            period['start'] = new_start
                            period['end'] = new_end
                            # Double-check that we actually changed something
                            if period['start'] != old_start or period['end'] != old_end:
                                update_vacation_env()
            
            # Remove button
            with col2:
                if st.button(
                    "🗑",
                    key=f"remove_{i}",
                    help=("Remove this vacation period" if st.session_state.get('is_gregorian', False) else "حذف فترة الإجازة"),
                    use_container_width=True
                ):
                    st.session_state.vacation_periods.pop(i)
                    update_vacation_env()
                    st.rerun()
        
        # Add new vacation period button
        col0_add, col1_add, col2_add = st.columns([1, 8, 1])
        with col2_add:
            if st.button(
                "✚",
                key="add_period",
                help=("Add new vacation period" if st.session_state.get('is_gregorian', False) else "إضافة فترة إجازة جديدة"),
                use_container_width=True
            ):
                last_end = st.session_state.vacation_periods[-1]['end'] if st.session_state.vacation_periods else date.today()
                new_start = last_end + timedelta(days=1)
                new_end = new_start + timedelta(days=7)
                
                # Create and validate new period
                new_period = {'start': new_start, 'end': new_end}
                if new_period['start'] <= new_period['end']:  # Basic validation
                    st.session_state.vacation_periods.append(new_period)
                    update_vacation_env()
                    logging.info(f"Added new vacation period: {new_start} to {new_end}")
                    st.rerun()
                else:
                    st.error("Invalid vacation period dates" if st.session_state.get('is_gregorian', False) else "تواريخ فترة الإجازة غير صحيحة")

def initialize_vacation_periods():
    """Initialize vacation periods from environment variables"""
    # Always reload .env to get the latest values
    load_dotenv(override=True)
    start_dates = os.getenv('VACATION_START_DATES', '').split(',') if os.getenv('VACATION_START_DATES') else []
    durations = os.getenv('VACATION_DURATIONS', '').split(',') if os.getenv('VACATION_DURATIONS') else []
    
    # Debug: Print what we loaded from .env
    logging.info(f"🔍 DEBUG: Loaded from .env - START_DATES: {start_dates}, DURATIONS: {durations}")
    
    # Always reinitialize from .env to ensure we have the latest data
    st.session_state.vacation_periods = []
    for i, start in enumerate(start_dates):
        if start and i < len(durations) and durations[i]:
            try:
                start_date = datetime.strptime(start.strip(), '%Y-%m-%d').date()
                duration = int(durations[i].strip())
                # Fix: Use same calculation as backend - duration is inclusive
                # For 22 days starting May 29: May 29 + 21 days = June 19 (22nd day inclusive)
                end_date = start_date + timedelta(days=duration - 1)
                
                # Debug: Print the calculation
                logging.info(f"🔍 DEBUG: Period {i}: START={start_date}, DURATION={duration}, END={end_date}")
                logging.info(f"🔍 DEBUG: Calculation: {start_date} + {duration-1} days = {end_date}")
                logging.info(f"🔍 DEBUG: Verification: Total days = {(end_date - start_date).days + 1}")
                
                st.session_state.vacation_periods.append({
                    'start': start_date,
                    'end': end_date
                })
                logging.info(f"Loaded vacation period: {start_date} to {end_date} ({duration} days inclusive)")
            except (ValueError, IndexError) as e:
                logging.error(f"Error parsing vacation period {i}: {e}")
                continue
    
    # Debug: Print final session state
    logging.info(f"🔍 DEBUG: Final vacation_periods in session state: {st.session_state.vacation_periods}")

# Function to update environment variables
def update_vacation_env():
    start_dates = ','.join([p['start'].strftime('%Y-%m-%d') for p in st.session_state.vacation_periods])
    # Fix: Add 1 to make the duration calculation consistent with backend logic
    # Backend does: end_date = start_date + timedelta(days=duration)
    # So duration should be: (end_date - start_date).days + 1 for inclusive end dates
    durations = ','.join([str((p['end'] - p['start']).days + 1) for p in st.session_state.vacation_periods])
    
    # Update .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
    
    try:
        # Update the .env file
        set_key(env_path, 'VACATION_START_DATES', start_dates)
        set_key(env_path, 'VACATION_DURATIONS', durations)
        
        # Update in-memory environment variables
        os.environ['VACATION_START_DATES'] = start_dates
        os.environ['VACATION_DURATIONS'] = durations
        
        # Verify that the changes were written correctly
        load_dotenv(override=True)  # Reload to verify
        saved_start_dates = os.getenv('VACATION_START_DATES', '')
        saved_durations = os.getenv('VACATION_DURATIONS', '')
        
        if saved_start_dates == start_dates and saved_durations == durations:
            logging.info("✅ Environment variables successfully updated and verified")
            st.toast("تم تحديث فترات الإجازة بنجاح!" if not st.session_state.get('is_gregorian', True) 
                    else "Vacation periods updated successfully!", icon="✅")
        else:
            logging.error(f"❌ Environment update verification failed. Expected: {start_dates}, {durations}. Got: {saved_start_dates}, {saved_durations}")
            st.error("Failed to update vacation settings" if st.session_state.get('is_gregorian', True) 
                    else "فشل في تحديث إعدادات الإجازة")
            
    except Exception as e:
        logging.error(f"❌ Failed to update vacation environment: {e}")
        st.error("Failed to update vacation settings" if st.session_state.get('is_gregorian', True) 
                else "فشل في تحديث إعدادات الإجازة") 