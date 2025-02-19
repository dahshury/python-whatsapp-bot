import streamlit as st
import json
import datetime

# Define the predetermined JSON file path
JSON_FILE_PATH = "threads_db.json"  # Replace with your actual file path

# Set the page configuration
st.set_page_config(page_title="Chat Viewer", layout="wide")

# Custom CSS for smaller arrow buttons and alignment
st.markdown("""
<style>
/* Make buttons smaller and inline-friendly */
div.stButton > button {
    font-size: 12px !important;
    padding: 2px 6px !important;
    margin: 0 auto !important;
}
</style>
""", unsafe_allow_html=True)

# -------------------------------
# Load JSON Data from File
# -------------------------------
try:
    with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    st.error(f"Failed to load JSON file from path: {JSON_FILE_PATH}")
    st.error(str(e))
    st.stop()

# -------------------------------
# Extract Unique Dates from Conversations
# -------------------------------
all_dates = set()
for conv in data.values():
    for msg in conv.get("conversation", []):
        date = msg.get("date")
        if date:
            all_dates.add(date)
all_dates = sorted(list(all_dates))

if not all_dates:
    st.sidebar.error("No valid dates found in the JSON file.")
else:
    # -------------------------------
    # Sidebar: Date Picker (Calendar)
    # -------------------------------
    all_dates_dt = [datetime.datetime.strptime(d, "%Y-%m-%d").date() for d in all_dates]
    
    # Let the user pick a date from the calendar
    selected_date = st.sidebar.date_input(
        "Select a date",
        value=all_dates_dt[0],
        min_value=all_dates_dt[0],
        max_value=all_dates_dt[-1]
    ).strftime("%Y-%m-%d")
    
    # Visual separator between the date picker and the conversation picker
    st.sidebar.markdown("<hr>", unsafe_allow_html=True)
    
    # -------------------------------
    # Filter conversations that include the selected date
    # -------------------------------
    conversations_for_date = [
        conv_id for conv_id, conv in data.items()
        if any(msg.get("date") == selected_date for msg in conv.get("conversation", []))
    ]
    
    if conversations_for_date:
        # -------------------------------
        # Maintain conversation index in session state
        # -------------------------------
        if ("selected_conv_index" not in st.session_state 
            or st.session_state.selected_conv_index >= len(conversations_for_date)):
            st.session_state.selected_conv_index = 0
        
        st.sidebar.write("**Select a conversation**")
        
        # -------------------------------
        # Conversation Navigation Row
        # -------------------------------
        conv_nav_col1, conv_nav_col2, conv_nav_col3 = st.sidebar.columns([1, 4, 1])
        
        # 1) Handle the LEFT arrow
        with conv_nav_col1:
            if st.button("⬅", key="conv_left"):
                if st.session_state.selected_conv_index > 0:
                    st.session_state.selected_conv_index -= 1
        
        # 2) Handle the RIGHT arrow
        with conv_nav_col3:
            if st.button("➡", key="conv_right"):
                if st.session_state.selected_conv_index < len(conversations_for_date) - 1:
                    st.session_state.selected_conv_index += 1
        
        # 3) Render the selectbox with the updated index
        with conv_nav_col2:
            selected_conv_dropdown = st.selectbox(
                "Conversations",  # Provide a real label (hidden below)
                options=conversations_for_date,
                index=st.session_state.selected_conv_index,
                label_visibility="collapsed"
            )
        
        # 4) If the user changed the dropdown, sync that to session state
        dropdown_index = conversations_for_date.index(selected_conv_dropdown)
        if dropdown_index != st.session_state.selected_conv_index:
            st.session_state.selected_conv_index = dropdown_index
        
        # Final selected conversation
        selected_conv = conversations_for_date[st.session_state.selected_conv_index]

        # -------------------------------
        # Main Area: Chat UI Display
        # -------------------------------
        st.title(f"Conversation: {selected_conv}")
        conversation = data[selected_conv].get("conversation", [])
        for msg in conversation:
            role = msg.get("role", "user")
            message = msg.get("message", "")
            with st.chat_message(role):
                st.markdown(message)
    else:
        st.info("No conversations found for the selected date.")
