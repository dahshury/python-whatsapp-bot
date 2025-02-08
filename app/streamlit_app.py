import streamlit as st
import shelve

# Define the shelve database file used for storing conversations.
CONVERSATIONS_DB = "conversations_db"

def get_conversation_keys():
    """
    Retrieve a list of all conversation keys from the shelve database.
    """
    with shelve.open(CONVERSATIONS_DB) as db:
        keys = list(db.keys())
    return keys

def load_conversation(conv_id):
    """
    Load the conversation messages for a given conversation ID.
    Returns a list of messages or an empty list if not found.
    """
    with shelve.open(CONVERSATIONS_DB) as db:
        return db.get(conv_id, [])

# -------------------------------
# Sidebar: Conversation List
# -------------------------------

st.sidebar.title("Conversations")

# Retrieve the list of conversation keys from the shelve database.
conv_keys = get_conversation_keys()

if not conv_keys:
    st.sidebar.info("No conversations found in the database.")
else:
    # Allow the user to select an existing conversation.
    selected_conv = st.sidebar.selectbox("Select a conversation", options=conv_keys)

    # -------------------------------
    # Main Area: Read-only Chat Display
    # -------------------------------
    st.title(f"Conversation: {selected_conv}")

    # Load the conversation messages for the selected conversation.
    messages = load_conversation(selected_conv)

    # If there are no messages, inform the user.
    if not messages:
        st.info("No messages found for this conversation.")
    else:
        # Display each message using the Streamlit chat message container.
        for message in messages:
            # Use st.chat_message to mimic a chat interface.
            with st.chat_message(message["role"]):
                st.markdown(message["content"])
