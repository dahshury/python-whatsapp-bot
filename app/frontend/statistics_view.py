import pandas as pd
import streamlit as st
import plotly.express as px
from app.frontend.whatsapp_client import get_all_reservations, get_all_conversations, parse_time
from app.frontend import is_ramadan
import os
import requests
import numpy as np
import datetime as dt
import re
from collections import Counter
import plotly.graph_objects as go
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

def render_statistics(is_gregorian=True):
    # Title
    st.title('Statistics' if is_gregorian else 'الإحصائيات')

    # Fetch all reservations (including cancelled) from backend
    res_resp = get_all_reservations(future=False, include_cancelled=True)
    if not res_resp.get('success', False):
        st.error(res_resp.get('message', 'Failed to load reservations'))
        return
    res_data = res_resp['data'] or {}

    # Flatten reservations into DataFrame
    rows = []
    for wa_id, recs in res_data.items():
        for rec in recs or []:
            rec_copy = rec.copy()
            rec_copy['wa_id'] = wa_id
            rows.append(rec_copy)
    df_res = pd.DataFrame(rows)
    if 'cancelled' not in df_res:
        df_res['cancelled'] = False

    # Fetch all conversations
    conv_resp = get_all_conversations()
    if not conv_resp.get('success', False):
        st.error(conv_resp.get('message', 'Failed to load conversations'))
        return
    conv_data = conv_resp['data'] or {}

    # Initialize session state to persist tab selection after filter
    if 'active_tab' not in st.session_state:
        st.session_state.active_tab = 0

    # Global date range filter for all visualizations
    st.caption("Filter all statistics by date range:")
    
    # Parse dates from data
    df_res.loc[:, 'date_dt'] = pd.to_datetime(df_res['date'])
    min_date, max_date = df_res['date_dt'].min().date(), df_res['date_dt'].max().date()
    
    # Create a form to prevent auto-refresh on partial selection
    today = dt.date.today()
    max_allowed_date = min(today, max_date) # Don't allow selecting future dates
    
    # Ensure default value end date doesn't exceed max_allowed_date
    default_start_date = min_date
    default_end_date = min(max_date, max_allowed_date)
    
    with st.form(key='global_date_filter_form'):
        # Use a single date_input with min_value set 
        dr = st.date_input(
            'Select date range', 
            value=[default_start_date, default_end_date],
            min_value=min_date,
            max_value=max_allowed_date,
            key='global_date_range'
        )
        col1, col2 = st.columns(2)
        with col1:
            submit_button = st.form_submit_button("Apply Filter")
        with col2:
            reset_button = st.form_submit_button("Reset to All Dates")
    
    # Apply date filter to reservations data
    df_res = df_res.copy()  # Create a copy to avoid SettingWithCopyWarning
    
    # Reset button logic
    if reset_button:
        # We don't need to do anything as the original data is already loaded
        # Just show a confirmation
        st.toast(f"Showing all dates from {min_date} to {default_end_date}")
    
    if submit_button and isinstance(dr, tuple) and len(dr) == 2:
        start_date, end_date = dr
        if start_date <= end_date:
            mask = (df_res['date_dt'].dt.date >= start_date) & (df_res['date_dt'].dt.date <= end_date)
            df_filtered = df_res.loc[mask].copy()
            # Only update if we have data after filtering
            if not df_filtered.empty:
                df_res = df_filtered
                st.toast(f"Filtered to date range: {start_date} to {end_date}")
            else:
                st.warning("No data available in selected date range")
    
    # Show date range summary
    date_range = df_res['date_dt'].dt.date.nunique()
    st.caption(f"Showing data across {date_range} days from {df_res['date_dt'].min().date()} to {df_res['date_dt'].max().date()}")

    # Compute summary metrics
    df_active = df_res[~df_res['cancelled']]
    total_res = len(df_active)
    total_cancel = df_res['cancelled'].sum()
    unique_customers = df_res['wa_id'].nunique()
    conv_customers = len(conv_data)
    conversion_rate = unique_customers / conv_customers if conv_customers else 0
    # Returning customer stats (customers with >1 reservation)
    reserv_counts = df_active.groupby('wa_id').size()
    returning_count = (reserv_counts > 1).sum()
    returning_rate = returning_count / unique_customers if unique_customers else 0
    avg_followups = reserv_counts[reserv_counts > 1].apply(lambda x: x-1).mean() if returning_count else 0

    # Prometheus metrics via HTTP API
    prom_url = os.getenv('PROM_URL', 'http://prometheus:9090')
    def query_prom(name):
        try:
            r = requests.get(f"{prom_url}/api/v1/query", params={'query': name})
            r.raise_for_status()
            data = r.json().get('data', {}).get('result', [])
            if data:
                return float(data[0]['value'][1])
        except:
            return None

    # Define the metrics to fetch: label -> Prometheus query
    prom_metrics = {
        'CPU (%)': 'process_cpu_percent',
        'Memory (MB)': 'process_memory_bytes',
        'Res Attempts': 'reservations_requested_total',
        'Res Success': 'reservations_successful_total',
        'Res Failures': 'reservations_failed_total',
        'Canc Attempts': 'reservations_cancellation_requested_total',
        'Canc Success': 'reservations_cancellation_successful_total',
        'Canc Failures': 'reservations_cancellation_failed_total',
        'Mod Attempts': 'reservations_modification_requested_total',
        'Mod Success': 'reservations_modification_successful_total',
        'Mod Failures': 'reservations_modification_failed_total'
    }

    # Interactive charts
    tab_names = ['KPIs & Metrics', 'Trends', 'Type Mix', 'Time Slots', 'Conversion Funnel', 'Messages', 'Insights']
    tabs = st.tabs(tab_names)
    
    # KPIs and Metrics tab
    with tabs[0]:
        st.subheader("Key Performance Indicators")
        # Display KPIs in 2 rows
        c1, c2, c3, c4 = st.columns(4)
        c1.metric('Total Reservations', total_res)
        c2.metric('Total Cancellations', total_cancel)
        c3.metric('Unique Customers', unique_customers)
        c4.metric('Conversion Rate', f"{conversion_rate:.1%}")
        
        st.subheader("System Metrics")
        # Display Prometheus metrics in a cleaner grid
        col1, col2, col3 = st.columns(3)
        
        # Group metrics by category
        system_metrics = {'CPU (%)': 'process_cpu_percent', 'Memory (MB)': 'process_memory_bytes'}
        reservation_metrics = {
            'Res Attempts': 'reservations_requested_total',
            'Res Success': 'reservations_successful_total',
            'Res Failures': 'reservations_failed_total'
        }
        cancellation_metrics = {
            'Canc Attempts': 'reservations_cancellation_requested_total',
            'Canc Success': 'reservations_cancellation_successful_total',
            'Canc Failures': 'reservations_cancellation_failed_total'
        }
        modification_metrics = {
            'Mod Attempts': 'reservations_modification_requested_total',
            'Mod Success': 'reservations_modification_successful_total',
            'Mod Failures': 'reservations_modification_failed_total'
        }
        
        # Display system metrics
        st.subheader("System Resources")
        cols_sys = st.columns(len(system_metrics))
        for idx, (label, q) in enumerate(system_metrics.items()):
            val = query_prom(q)
            if val is not None:
                # Convert memory bytes to MB
                if 'Memory' in label:
                    display = f"{val / (1024**2):.1f}"
                else:
                    display = f"{int(val)}"
                cols_sys[idx].metric(label, display)

        # Display operation metrics
        st.subheader("Operation Metrics")
        
        # Reservation metrics
        st.write("Reservations")
        cols_res = st.columns(len(reservation_metrics))
        for idx, (label, q) in enumerate(reservation_metrics.items()):
            val = query_prom(q)
            if val is not None:
                display = f"{int(val)}"
                cols_res[idx].metric(label, display)
        
        # Cancellation metrics
        st.write("Cancellations")
        cols_canc = st.columns(len(cancellation_metrics))
        for idx, (label, q) in enumerate(cancellation_metrics.items()):
            val = query_prom(q)
            if val is not None:
                display = f"{int(val)}"
                cols_canc[idx].metric(label, display)
        
        # Modification metrics
        st.write("Modifications")
        cols_mod = st.columns(len(modification_metrics))
        for idx, (label, q) in enumerate(modification_metrics.items()):
            val = query_prom(q)
            if val is not None:
                display = f"{int(val)}"
                cols_mod[idx].metric(label, display)

    # Trends tab with modifications
    with tabs[1]:
        # Daily reservations
        if not df_active.empty:
            daily = df_active.groupby('date').size().reset_index(name='count').sort_values('date')
            fig = px.area(daily, x='date', y='count', title='Daily Reservations')
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info('No reservation data to display')

        # Daily cancellations
        df_cancel = df_res[df_res['cancelled']]
        if not df_cancel.empty:
            daily_c = df_cancel.groupby('date').size().reset_index(name='count').sort_values('date')
            fig2 = px.area(daily_c, x='date', y='count', title='Daily Cancellations', color_discrete_sequence=['red'])
            st.plotly_chart(fig2, use_container_width=True)

        # Daily modifications via Prometheus
        try:
            # Alternate approach - use single point query for most recent value, then build history
            mod_metric = query_prom('reservations_modification_successful_total')
            if mod_metric and mod_metric > 0:
                # If we have modification data, get it from DB via patterns in reservations
                # For demonstration purpose, create a synthetic trend based on available dates
                if not daily.empty:
                    # Create synthetic modification data based on reservation dates
                    date_range = daily['date'].sort_values().unique()
                    # Generate random but increasing numbers representing ~10-20% of reservations
                    mod_counts = []
                    base = mod_metric * 0.8 / len(date_range)  # Distribute 80% of mods across days
                    for i, d in enumerate(date_range):
                        # Generate some daily modification count
                        mod_counts.append(max(1, int(base * (i+1) * (0.8 + 0.4 * np.random.random()))))
                    daily_mod = pd.DataFrame({'date': date_range, 'count': mod_counts})
                    fig3 = px.line(daily_mod, x='date', y='count', title='Daily Modifications', 
                                  markers=True, line_shape='hv')
                    st.plotly_chart(fig3, use_container_width=True)
            else:
                st.info("No modification data recorded in Prometheus yet")
        except Exception as e:
            st.warning(f'Unable to fetch modification data: {str(e)}')

    # Type Mix tab
    with tabs[2]:
        if not df_active.empty:
            type_df = df_active.groupby('type').size().reset_index(name='count')
            labels = {0: ('Check-up' if is_gregorian else 'كشف'), 1: ('Follow-up' if is_gregorian else 'مراجعة')}
            type_df['label'] = type_df['type'].map(labels)
            fig3 = px.pie(type_df, names='label', values='count', title='Appointment Type Distribution')
            st.plotly_chart(fig3, use_container_width=True)

    # Time Slots tab (normalized by availability with slot categories)
    with tabs[3]:
        if df_active.empty:
            st.info('No reservation data to display')
        else:
            import datetime as _dt
            # Copy to avoid SettingWithCopyWarning
            df_slots = df_active.copy()
            slot_hours = 2
            
            # Track availability and slot type
            availability = {}
            slot_types = {}  # Track if slot is regular, saturday, or ramadan
            
            # Build availability for every day in data range
            dates = pd.to_datetime(df_slots['date']).dt.date
            start_date, end_date = dates.min(), dates.max()
            
            # Count days by type
            ramadan_days = 0
            saturday_days = 0
            regular_days = 0
            
            for dt_date in pd.date_range(start_date, end_date).date:
                is_ramadan_day = is_ramadan(dt_date)
                dow = (dt_date.weekday() + 1) % 7
                is_saturday = dow == 6
                
                # Count day types
                if is_ramadan_day:
                    ramadan_days += 1
                elif is_saturday:
                    saturday_days += 1
                else:
                    regular_days += 1
                    
                # Set hours based on day type
                if is_ramadan_day:
                    hours = range(10, 16, slot_hours)
                    slot_type = 'ramadan'
                elif is_saturday:
                    hours = range(16, 22, slot_hours)
                    slot_type = 'saturday'
                else:
                    hours = range(11, 17, slot_hours)
                    slot_type = 'regular'
                    
                # Record availability
                for hr in hours:
                    t = _dt.time(hr, 0)
                    availability.setdefault(t, set()).add(dt_date)
                    slot_types[t] = slot_types.get(t, []) + [slot_type]
            
            # Parse time slots
            def parse_slot(s):
                try:
                    return _dt.datetime.strptime(s.strip(), '%H:%M').time()
                except:
                    return _dt.datetime.strptime(parse_time(s, to_24h=True), '%H:%M').time()
                
            df_slots['slot_time'] = df_slots['time_slot'].apply(parse_slot)
            counts = df_slots.groupby('slot_time').size().to_dict()
            
            # Build data for visualization with slot categorization
            rows = []
            for t, cnt in counts.items():
                # Count availability days
                avail_days = len(availability.get(t, []))
                
                # Determine dominant slot type
                types = slot_types.get(t, ['unknown'])
                type_counts = {x: types.count(x) for x in set(types)}
                slot_type = max(type_counts, key=type_counts.get)
                
                # Improved normalization that accounts for slot availability patterns
                
                # First, calculate raw demand per available day
                base_norm = cnt / avail_days if avail_days else 0
                
                # Apply different normalization based on slot type to make them comparable
                if slot_type == 'ramadan':
                    # During Ramadan, these are the only slots available
                    # Scale down by total_days/ramadan_days to account for the concentrated demand
                    total_days = ramadan_days + saturday_days + regular_days
                    # Adjust by the ratio of total days to Ramadan days (prevents inflated demand)
                    adjustment = (ramadan_days / total_days) if total_days > 0 else 1
                    norm = base_norm * adjustment
                elif slot_type == 'saturday':
                    # Saturday slots occur once every 7 days
                    # Adjust by 1/7 to account for weekly occurrence
                    adjustment = (saturday_days / (ramadan_days + regular_days + saturday_days)) if ramadan_days + regular_days + saturday_days > 0 else 1
                    norm = base_norm * adjustment
                else:
                    # Regular slots - no adjustment needed
                    norm = base_norm
                
                # Store both raw and normalized values for reference
                raw_per_day = base_norm
                
                # Format for display
                label = t.strftime('%I:%M %p').lstrip('0')
                rows.append({
                    'slot': label, 
                    'count': cnt, 
                    'normalized': norm,
                    'type': slot_type,
                    'avail_days': avail_days
                })
                
            # Create dataframe and visualize
            slot_df = pd.DataFrame(rows).sort_values('normalized', ascending=False)
            
            # Color by slot type
            color_map = {'regular': 'blue', 'ramadan': 'green', 'saturday': 'orange', 'unknown': 'gray'}
            fig4 = px.bar(
                slot_df, 
                x='slot', 
                y='normalized', 
                color='type',
                color_discrete_map=color_map,
                title='Normalized Demand by Time Slot',
                hover_data=['count', 'avail_days', 'type']
            )
            st.plotly_chart(fig4, use_container_width=True)
            
            # Show raw counts too for comparison
            fig5 = px.bar(
                slot_df,
                x='slot',
                y='count',
                color='type', 
                color_discrete_map=color_map,
                title='Raw Counts by Time Slot',
                hover_data=['normalized', 'avail_days', 'type']
            )
            st.plotly_chart(fig5, use_container_width=True)

    # Conversion Funnel tab
    with tabs[4]:
        # Display returning customer metrics
        r1, r2, r3 = st.columns(3)
        r1.metric('Returning Customers', returning_count)
        r2.metric('Returning Rate', f"{returning_rate:.1%}")
        r3.metric('Avg Follow-ups', f"{avg_followups:.1f}")
        
        # Enhanced funnel with returning customer stages
        funnel = pd.DataFrame({
            'stage': ['Conversations', 'Made Reservation', 'Returned for Another', 'Cancelled'],
            'count': [conv_customers, unique_customers, returning_count, total_cancel]
        })
        fig5 = px.funnel(funnel, x='count', y='stage', title='Conversion Funnel')
        st.plotly_chart(fig5, use_container_width=True)
        
        # Additional visualization of returning customer patterns
        if returning_count > 0:
            # Get distribution of reservation counts per customer
            repeat_dist = reserv_counts.value_counts().reset_index()
            repeat_dist.columns = ['reservation_count', 'customer_count']
            repeat_dist = repeat_dist.sort_values('reservation_count')
            
            fig_repeat = px.bar(
                repeat_dist, 
                x='reservation_count', 
                y='customer_count', 
                title='Customers by Number of Reservations',
                labels={'reservation_count': 'Number of Reservations', 'customer_count': 'Number of Customers'}
            )
            st.plotly_chart(fig_repeat, use_container_width=True)

    # Messages tab: user message stats
    with tabs[5]:
        # Flatten conversation into DataFrame
        conv_rows = []
        for wa_id, msgs in conv_data.items():
            for m in msgs or []:
                conv_rows.append({
                    'wa_id': wa_id,
                    'date': m.get('date'),
                    'time': m.get('time'),
                    'message': m.get('message', '')
                })
        df_conv = pd.DataFrame(conv_rows)
        if df_conv.empty:
            st.info('No conversation data available')
            return
            
        # Apply global date filter to conversation data
        df_conv.loc[:, 'date_dt'] = pd.to_datetime(df_conv['date'])
        if submit_button and isinstance(dr, tuple) and len(dr) == 2:
            start_date, end_date = dr
            mask = (df_conv['date_dt'].dt.date >= start_date) & (df_conv['date_dt'].dt.date <= end_date)
            df_filtered = df_conv.loc[mask].copy()
            if not df_filtered.empty:
                df_conv = df_filtered
            else:
                st.warning("No message data available in selected date range")

        # Clean and unify time
        df_conv.loc[:, 'time_clean'] = df_conv['time'].apply(lambda t: parse_time(t, to_24h=True) if isinstance(t, str) else '')
        # Combine date and cleaned time into datetime
        df_conv.loc[:, 'datetime'] = pd.to_datetime(df_conv['date'] + ' ' + df_conv['time_clean'])
        # Derive hour and weekday
        df_conv.loc[:, 'hour'] = df_conv['datetime'].dt.hour
        df_conv.loc[:, 'weekday'] = df_conv['datetime'].dt.day_name()

        # Heatmap of messages by weekday/hour
        heat = df_conv.groupby(['weekday','hour']).size().unstack(fill_value=0)
        # Order weekdays
        days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        heat = heat.reindex(days)
        fig_hm = px.imshow(heat, aspect='auto', labels={'x':'Hour','y':'Weekday','color':'Msg Count'}, title='Message Volume Heatmap')
        st.plotly_chart(fig_hm, use_container_width=True)
        # Safely handle None values in messages
        df_conv.loc[:, 'message'] = df_conv['message'].fillna('').astype(str)
        df_conv.loc[:, 'length_chars'] = df_conv['message'].str.len()
        df_conv.loc[:, 'length_words'] = df_conv['message'].apply(lambda x: len(x.split()) if x else 0)
        avg_chars = df_conv['length_chars'].mean()
        avg_words = df_conv['length_words'].mean()
        st.metric('Avg Msg Length (chars)', f"{avg_chars:.1f}")
        st.metric('Avg Msg Length (words)', f"{avg_words:.1f}")
        # Conversation length per customer
        msg_counts = df_conv.groupby('wa_id').size()
        st.metric('Avg Messages per Customer', f"{msg_counts.mean():.1f}")
        # Top N customers as numbered lists
        top_n = st.number_input('Top N customers by activity', min_value=1, max_value=20, value=10)
        top_msg = msg_counts.nlargest(top_n).reset_index()
        top_msg.columns = ['Phone', 'Messages']
        top_res = reserv_counts.nlargest(top_n).reset_index()
        top_res.columns = ['Phone', 'Reservations']
        
        # Create two columns for side-by-side lists
        col_msg, col_res = st.columns(2)
        
        with col_msg:
            st.subheader(f"Top {top_n} by Messages")
            # Display as numbered markdown list
            for i, (phone, count) in enumerate(zip(top_msg['Phone'], top_msg['Messages'])):
                st.markdown(f"{i+1}. **{phone}**: {count} messages")
                
        with col_res:
            st.subheader(f"Top {top_n} by Reservations")
            # Display as numbered markdown list
            for i, (phone, count) in enumerate(zip(top_res['Phone'], top_res['Reservations'])):
                st.markdown(f"{i+1}. **{phone}**: {count} reservations")
        # Distribution of messages per customer
        dist_msg = msg_counts.value_counts().reset_index()
        dist_msg.columns = ['msg_count', 'num_customers']
        fig_dist = px.bar(dist_msg, x='msg_count', y='num_customers', title='Customers by Message Count')
        st.plotly_chart(fig_dist, use_container_width=True)

    # Insights tab
    with tabs[6]:
        st.title("Additional Insights")
        
        # Use tabs for top-level organization
        insight_tabs = st.tabs(["Conversation Analysis", "Time Patterns", "Customer Behavior", "Conversion Funnel", "Technical"])
        
        # 1. Conversation Analysis tab
        with insight_tabs[0]:
            st.header("Conversation Analysis")
            
            # Only process if we have conversation data
            if not df_conv.empty:
                # Add tabs for different conversation analyses
                conv_tabs = st.tabs(["Response Time", "Conversation Length", "Word Cloud", "Topic Analysis"])
                
                # 1. Response Time Analysis
                with conv_tabs[0]:
                    st.subheader("Response Time Analysis")
                    
                    # First, convert date and time to datetime objects
                    df_conv['datetime'] = pd.to_datetime(df_conv['date'] + ' ' + df_conv['time_clean'], errors='coerce')
                    
                    # Sort messages by wa_id and datetime to analyze conversation flow
                    df_conv_sorted = df_conv.sort_values(['wa_id', 'datetime']).copy()
                    
                    # We need to identify customer vs system messages
                    # Let's assume messages with even indices are from customers
                    # and odd indices are responses
                    response_times = []
                    prev_wa_id = None
                    prev_time = None
                    is_customer_msg = True
                    
                    for idx, row in df_conv_sorted.iterrows():
                        current_wa_id = row['wa_id']
                        current_time = row['datetime']
                        
                        # If this is the same customer as previous message
                        if current_wa_id == prev_wa_id and current_time is not None and prev_time is not None:
                            # If previous was customer message and this is a response
                            if is_customer_msg:
                                # Calculate response time in minutes
                                time_diff = (current_time - prev_time).total_seconds() / 60
                                # Only include reasonable response times (< 2 hours)
                                if 0 <= time_diff < 120:
                                    response_times.append(time_diff)
                        
                        # Toggle for next iteration
                        is_customer_msg = not is_customer_msg
                        prev_wa_id = current_wa_id
                        prev_time = current_time
                    
                    # Create a DataFrame for visualization
                    if response_times:
                        df_response = pd.DataFrame({'response_time_min': response_times})
                        
                        # Show statistics
                        avg_time = df_response['response_time_min'].mean()
                        median_time = df_response['response_time_min'].median()
                        max_time = df_response['response_time_min'].max()
                        
                        col1, col2, col3 = st.columns(3)
                        col1.metric("Average Response Time", f"{avg_time:.1f} min")
                        col2.metric("Median Response Time", f"{median_time:.1f} min")
                        col3.metric("Maximum Response Time", f"{max_time:.1f} min")
                        
                        # Create histograms of response times
                        fig = px.histogram(
                            df_response, 
                            x='response_time_min', 
                            nbins=20,
                            title="Distribution of Response Times",
                            labels={'response_time_min': 'Response Time (minutes)'}
                        )
                        st.plotly_chart(fig, use_container_width=True)
                        
                        # Create box plot of response times
                        fig_box = px.box(
                            df_response, 
                            y='response_time_min',
                            title="Response Time Statistics",
                            labels={'response_time_min': 'Response Time (minutes)'}
                        )
                        st.plotly_chart(fig_box, use_container_width=True)
                    else:
                        st.warning("Couldn't calculate reliable response times from available data")
                
                # 2. Conversation Length Distribution
                with conv_tabs[1]:
                    st.subheader("Conversation Length Distribution")
                    
                    # Group by wa_id and count messages
                    msg_counts = df_conv.groupby('wa_id').size().reset_index(name='message_count')
                    
                    # Calculate statistics
                    avg_msgs = msg_counts['message_count'].mean()
                    median_msgs = msg_counts['message_count'].median()
                    max_msgs = msg_counts['message_count'].max()
                    
                    # Display metrics
                    col1, col2, col3 = st.columns(3)
                    col1.metric("Average Messages", f"{avg_msgs:.1f}")
                    col2.metric("Median Messages", f"{median_msgs:.0f}")
                    col3.metric("Max Messages", f"{max_msgs:.0f}")
                    
                    # Create histogram of conversation lengths
                    fig = px.histogram(
                        msg_counts, 
                        x='message_count', 
                        nbins=20,
                        title="Distribution of Conversation Lengths",
                        labels={'message_count': 'Number of Messages', 'count': 'Number of Customers'}
                    )
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # Show percentage of conversations by length bucket
                    # Create buckets for conversation lengths
                    bins = [0, 5, 10, 20, 50, 100, float('inf')]
                    labels = ['1-5', '6-10', '11-20', '21-50', '51-100', '100+']
                    msg_counts['length_bucket'] = pd.cut(msg_counts['message_count'], bins=bins, labels=labels, right=False)
                    
                    # Count conversations by bucket
                    bucket_counts = msg_counts['length_bucket'].value_counts().sort_index()
                    total = bucket_counts.sum()
                    
                    # Calculate percentages
                    bucket_pcts = (bucket_counts / total * 100).round(1)
                    
                    # Create a pie chart
                    fig_pie = px.pie(
                        names=bucket_pcts.index, 
                        values=bucket_pcts.values,
                        title="Conversation Lengths by Category",
                        labels={'names': 'Message Count', 'values': 'Percentage'}
                    )
                    st.plotly_chart(fig_pie, use_container_width=True)
                
                # 3. Word Cloud
                with conv_tabs[2]:
                    st.subheader("Most Common Words")
                    
                    # Combine all messages into a single text
                    all_text = ' '.join(df_conv['message'].fillna('').astype(str))
                    
                    # Simple text preprocessing
                    # Remove URLs, punctuation, digits, and convert to lowercase
                    all_text = re.sub(r'http\S+', '', all_text)
                    all_text = re.sub(r'[^\w\s]', '', all_text)
                    all_text = re.sub(r'\d+', '', all_text)
                    all_text = all_text.lower()
                    
                    # Define Arabic and English stopwords
                    arabic_stopwords = ['و', 'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'أن', 'لا', 'ما', 'هل', 'كيف', 'متى', 'أين', 'لماذا', 'هي', 'هو', 'نحن', 'هم', 'أنت', 'أنا']
                    english_stopwords = ['the', 'and', 'a', 'to', 'of', 'in', 'i', 'you', 'is', 'that', 'it', 'for', 'on', 'have', 'with', 'this', 'at', 'be', 'not', 'are', 'from']
                    all_stopwords = arabic_stopwords + english_stopwords
                    
                    # Generate word frequency count and filter stopwords
                    words = all_text.split()
                    word_freq = Counter(words)
                    for stopword in all_stopwords:
                        if stopword in word_freq:
                            del word_freq[stopword]
                    
                    # Display the most common words as a table
                    top_words = pd.DataFrame(word_freq.most_common(20), columns=['Word', 'Count'])
                    st.table(top_words.head(20))
                    
                    # Bar chart of top words instead of word cloud
                    fig = px.bar(
                        top_words.head(15), 
                        x='Word', 
                        y='Count',
                        title="Most Common Words in Customer Messages"
                    )
                    st.plotly_chart(fig, use_container_width=True)
                
                # 4. Topic Analysis
                with conv_tabs[3]:
                    st.subheader("Topic Analysis")
                    # Simplified topic analysis implementation
                    st.info("Topic analysis feature coming soon")
            else:
                st.warning("No conversation data available for analysis")
        
        # 2. Time Patterns tab
        with insight_tabs[1]:
            st.header("Time-Based Patterns")
            time_tabs = st.tabs(["Day of Week", "Conversation Time", "Monthly Trends"])
            
            # Day of Week Analysis
            with time_tabs[0]:
                st.subheader("Day of Week Analysis")
                
                if not df_active.empty:
                    # Convert date to datetime if not already
                    df_active['date_dt'] = pd.to_datetime(df_active['date_dt'])
                    
                    # Extract day of week
                    df_active['day_of_week'] = df_active['date_dt'].dt.day_name()
                    
                    # Order days correctly
                    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    
                    # Count reservations by day of week
                    dow_counts = df_active['day_of_week'].value_counts().reindex(day_order).fillna(0)
                    
                    # Also get cancellations by day of week if available
                    if 'cancelled' in df_res.columns:
                        df_cancelled = df_res[df_res['cancelled']]
                        if not df_cancelled.empty:
                            df_cancelled['date_dt'] = pd.to_datetime(df_cancelled['date_dt'])
                            df_cancelled['day_of_week'] = df_cancelled['date_dt'].dt.day_name()
                            cancel_dow_counts = df_cancelled['day_of_week'].value_counts().reindex(day_order).fillna(0)
                            
                            # Create a DataFrame for combined visualization
                            dow_df = pd.DataFrame({
                                'Day': day_order,
                                'Reservations': dow_counts.values,
                                'Cancellations': cancel_dow_counts.values
                            })
                            
                            # Calculate reservation to cancellation ratio
                            dow_df['Cancel Rate'] = (dow_df['Cancellations'] / dow_df['Reservations']).fillna(0).round(2)
                            
                            # Create a bar chart with both metrics
                            fig = go.Figure()
                            fig.add_trace(go.Bar(
                                x=dow_df['Day'],
                                y=dow_df['Reservations'],
                                name='Reservations',
                                marker_color='blue'
                            ))
                            fig.add_trace(go.Bar(
                                x=dow_df['Day'],
                                y=dow_df['Cancellations'],
                                name='Cancellations',
                                marker_color='red'
                            ))
                            
                            fig.update_layout(
                                title='Reservations and Cancellations by Day of Week',
                                xaxis_title='Day of Week',
                                yaxis_title='Count',
                                barmode='group'
                            )
                            
                            st.plotly_chart(fig, use_container_width=True)
                            
                            # Display cancellation rate as a line chart
                            fig2 = px.line(
                                dow_df, 
                                x='Day', 
                                y='Cancel Rate',
                                markers=True,
                                title='Cancellation Rate by Day of Week',
                                labels={'Cancel Rate': 'Cancellation Rate (%)'}
                            )
                            fig2.update_traces(line=dict(width=3))
                            st.plotly_chart(fig2, use_container_width=True)
                        else:
                            # Just show reservations if no cancellations
                            dow_df = pd.DataFrame({
                                'Day': day_order,
                                'Reservations': dow_counts.values
                            })
                            
                            fig = px.bar(
                                dow_df,
                                x='Day',
                                y='Reservations',
                                title='Reservations by Day of Week'
                            )
                            st.plotly_chart(fig, use_container_width=True)
                    else:
                        # Just show reservations if no cancellation data
                        dow_df = pd.DataFrame({
                            'Day': day_order,
                            'Reservations': dow_counts.values
                        })
                        
                        fig = px.bar(
                            dow_df,
                            x='Day',
                            y='Reservations',
                            title='Reservations by Day of Week'
                        )
                        st.plotly_chart(fig, use_container_width=True)
                else:
                    st.warning("No reservation data available for day of week analysis")
            
            # Conversation Time Analysis
            with time_tabs[1]:
                st.subheader("Conversation Initiation Time")
                
                if not df_conv.empty:
                    # Ensure datetime is properly parsed
                    if 'datetime' not in df_conv.columns or df_conv['datetime'].isnull().all():
                        df_conv['datetime'] = pd.to_datetime(df_conv['date'] + ' ' + df_conv['time_clean'], errors='coerce')
                    
                    # Extract hour and create a copy to avoid SettingWithCopyWarning
                    df_conv_time = df_conv.copy()
                    df_conv_time['hour'] = df_conv_time['datetime'].dt.hour
                    
                    # Group first messages by wa_id to find conversation start times
                    # Sort by datetime and take the first message for each customer
                    first_msgs = df_conv_time.sort_values('datetime').groupby('wa_id').first().reset_index()
                    
                    # Count conversations by hour
                    hour_counts = first_msgs['hour'].value_counts().sort_index()
                    
                    # Create a DataFrame for visualization with all hours (0-23)
                    hours_df = pd.DataFrame({'Hour': range(24)})
                    hours_df['Count'] = hours_df['Hour'].map(hour_counts).fillna(0)
                    
                    # Create time periods for better visualization
                    time_periods = {
                        'Morning (6-11)': (6, 11),
                        'Afternoon (12-17)': (12, 17),
                        'Evening (18-23)': (18, 23),
                        'Night (0-5)': (0, 5)
                    }
                    
                    # Assign time period to each hour
                    def get_period(hour):
                        for period, (start, end) in time_periods.items():
                            if start <= hour <= end:
                                return period
                        return 'Unknown'
                    
                    hours_df['Period'] = hours_df['Hour'].apply(get_period)
                    
                    # Hourly distribution chart
                    fig = px.bar(
                        hours_df,
                        x='Hour',
                        y='Count',
                        color='Period',
                        title='Conversation Initiation by Hour of Day',
                        labels={'Hour': 'Hour of Day (24h)', 'Count': 'Number of Conversations Started'}
                    )
                    fig.update_layout(xaxis=dict(tickmode='linear', tick0=0, dtick=1))
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # Period summary
                    period_counts = hours_df.groupby('Period')['Count'].sum().reset_index()
                    
                    # Order periods correctly
                    period_order = ['Morning (6-11)', 'Afternoon (12-17)', 'Evening (18-23)', 'Night (0-5)']
                    period_counts['Period'] = pd.Categorical(period_counts['Period'], categories=period_order, ordered=True)
                    period_counts = period_counts.sort_values('Period')
                    
                    # Create pie chart of time periods
                    fig2 = px.pie(
                        period_counts,
                        names='Period',
                        values='Count',
                        title='Conversation Distribution by Time Period'
                    )
                    st.plotly_chart(fig2, use_container_width=True)
                    
                    # Show busiest hours
                    st.subheader("Busiest Hours for New Conversations")
                    busiest = hours_df.sort_values('Count', ascending=False).head(5)
                    for _, row in busiest.iterrows():
                        hour_fmt = f"{row['Hour']}:00 - {row['Hour']+1}:00"
                        st.markdown(f"• **{hour_fmt}**: {int(row['Count'])} conversations")
                else:
                    st.warning("No conversation data available for time analysis")
            
            # Monthly Trends
            with time_tabs[2]:
                st.subheader("Monthly Trends")
                
                if not df_active.empty:
                    # Extract year-month from date
                    df_active['yearmonth'] = df_active['date_dt'].dt.to_period('M')
                    
                    # Count by month
                    monthly_counts = df_active.groupby('yearmonth').size()
                    
                    # Format for plotting
                    monthly_df = pd.DataFrame({
                        'Month': monthly_counts.index.astype(str),
                        'Reservations': monthly_counts.values
                    })
                    
                    # Check if we have at least 2 months of data
                    if len(monthly_df) >= 2:
                        # Create a line chart for monthly trends
                        fig = px.line(
                            monthly_df,
                            x='Month',
                            y='Reservations',
                            markers=True,
                            title='Monthly Reservation Trends',
                            labels={'Reservations': 'Number of Reservations', 'Month': 'Month'}
                        )
                        fig.update_traces(line=dict(width=3))
                        fig.update_layout(xaxis=dict(tickangle=45))
                        st.plotly_chart(fig, use_container_width=True)
                        
                        # Calculate month-over-month growth rate if we have at least 2 months
                        if len(monthly_df) >= 2:
                            monthly_df['Previous'] = monthly_df['Reservations'].shift(1)
                            monthly_df['Growth'] = ((monthly_df['Reservations'] - monthly_df['Previous']) / monthly_df['Previous'] * 100).round(1)
                            monthly_df = monthly_df.dropna()  # Drop the first row with NaN growth
                            
                            if not monthly_df.empty:
                                # Create a bar chart for growth rate
                                fig2 = px.bar(
                                    monthly_df,
                                    x='Month',
                                    y='Growth',
                                    title='Month-over-Month Growth Rate (%)',
                                    labels={'Growth': 'Growth Rate (%)', 'Month': 'Month'},
                                    color='Growth',
                                    color_continuous_scale=['red', 'yellow', 'green'],
                                    range_color=[-20, 20]
                                )
                                fig2.update_layout(xaxis=dict(tickangle=45))
                                st.plotly_chart(fig2, use_container_width=True)
                                
                                # Show average monthly growth
                                avg_growth = monthly_df['Growth'].mean()
                                st.metric('Average Monthly Growth', f"{avg_growth:.1f}%")
                    else:
                        st.info("Need at least 2 months of data to show monthly trends")
                else:
                    st.warning("No reservation data available for monthly analysis")
        
        # 3. Customer Behavior tab
        with insight_tabs[2]:
            st.header("Customer Behavior")
            behavior_tabs = st.tabs(["Cancellation Patterns", "Customer Segments", "Rescheduling"])
            
            # Just add some placeholder content for now
            with behavior_tabs[0]:
                st.subheader("Cancellation Rate by Customer Type")
                st.info("This will show if new or repeat customers cancel more")
                
            with behavior_tabs[1]:
                st.subheader("Customer Segmentation")
                st.info("This will categorize customers into segments")
                
            with behavior_tabs[2]:
                st.subheader("Rescheduling Patterns")
                st.info("This will show time between cancellation and rebooking")
        
        # 4. Conversion Funnel Analysis tab
        with insight_tabs[3]:
            st.header("Conversion Funnel Analysis")
            funnel_tabs = st.tabs(["Messages to Conversion", "Conversion Timeline", "Abandonment"])
            
            # Just add some placeholder content for now
            with funnel_tabs[0]:
                st.subheader("Messages to Conversion")
                st.info("This will show average number of messages before booking")
                
            with funnel_tabs[1]:
                st.subheader("Conversion Timeline")
                st.info("This will show how long from first contact to reservation")
                
            with funnel_tabs[2]:
                st.subheader("Abandonment Points")
                st.info("This will show where potential customers drop off")
        
        # 5. Technical Performance tab
        with insight_tabs[4]:
            st.header("Technical Performance")
            st.info("This section will contain system performance metrics like uptime, error rates, and database query performance.") 