
# AI-WhatsApp-Reservation-App

![alt text](media/1.png)
![alt text](<media/Screenshot 2025-03-14 014221.png>)
![alt text](<media/Screenshot 2025-03-14 014527.png>)
This project is a WhatsApp bot built using FastAPI, integrated with OpenAI and Anthropic for generating intelligent responses for customers using Whatsapp API, and includes a Streamlit frontend for managing reservations and managing bookings into a SQLite database. The bot allows users to make, modify, and cancel reservations via WhatsApp, while the front-end Streamlit application provides a graphical interface for managing reservations and customers messages. The project is designed to be easily deployable on various platforms, including AWS and Heroku.

For the original repository and setup torial (Flask version), please refer to [this GitHub repository](https://github.com/daveebbelaar/python-whatsapp-bot).

## Prerequisites

- A Meta developer account. If you don’t have one, [create a Meta developer account here](https://developers.facebook.com/). For detailed steps, refer to the original tutorial above.
- A business app. If you don't have one, [learn to create a business app here](https://developers.facebook.com/docs/development/create-an-app/). For detailed steps, refer to the original tutorial above.
- Familiarity with Python and FastAPI.
- Deployment platform (e.g., AWS, Heroku, or local server) to host the FastAPI application and Streamlit frontend.
- A valid OpenAI or Anthropic API key for AI response generation.

This project is a WhatsApp bot built using FastAPI, integrated with OpenAI for generating intelligent responses, and includes a Streamlit frontend for managing reservations and visualizing data into a SQLite database. The bot allows users to make, modify, and cancel reservations via WhatsApp, with the assistance of AI for natural language understanding.

## Project Structure

The project is organized as follows:

```plaintext
├── app/                     # Main application code
│   ├── decorators/          # Decorator functions
│   │   ├── __init__.py
│   │   ├── safety.py        # Additional security-related tasks
│   │   └── security.py      # Handles signature verification for webhook requests
│   ├── frontend/            # Frontend code for the Streamlit interface
│   │   └── __init__.py      # Defines Streamlit components and authentication logic
│   ├── services/            # Service modules providing business logic
│   │   ├── anthropic_service.py    # Integrates with Anthropic to generate AI-driven responses
│   │   ├── assistant_functions.py  # Functions for managing reservations (booking, modifying, canceling)
│   │   └── openai_service.py       # Integrates with OpenAI to generate AI-driven responses
│   ├── utils/               # Utility functions
│   │   ├── __init__.py      # Imports utility functions from submodules
│   │   ├── service_utils.py # Helper functions for services (thread management, date parsing)
│   │   └── whatsapp_utils.py# Utilities for interacting with the WhatsApp API (sending messages, processing text)
│   ├── __init__.py          # Makes the `app` directory a Python package and initializes the FastAPI app
│   ├── config.py            # Configuration settings loaded from environment variables
│   ├── db.py                # Database connection and schema definitions using SQLite
│   └── views.py             # FastAPI route definitions for handling webhooks and data downloads
├── README.md                # Project documentation
├── run.py                   # Entry point to run the FastAPI application
├── send_reminders.py        # Script to send reminders for upcoming reservations
└── st_app.py                # Streamlit application for the frontend interface
```

## Overall Operation

The application operates as follows:

1. **Webhook Handling**:
   - The FastAPI application in `views.py` listens for incoming webhooks from WhatsApp at the `/webhook` endpoint.
   - Incoming requests are verified using the `verify_signature` decorator from `security.py` to ensure authenticity.

2. **Message Processing**:
   - When a message is received, it is parsed in `openai_service.py` via the `process_whatsapp_message` function.
   - The `openai_service.py` module uses OpenAI's API to generate an intelligent response based on the message content.

3. **Database Interactions**:
   - The application uses SQLite, managed by `db.py`, to store data such as conversation history, reservation details, and thread information.
   - Tables include `threads`, `conversation`, `reservations`, and `cancelled_reservations`.

4. **Reservation Management**:
   - Users can interact with the bot via WhatsApp to make, modify, or cancel reservations.
   - The `assistant_functions.py` module handles these operations, updating the database accordingly.

5. **Utility Functions**:
   - Functions in `utils/service_utils.py` and `utils/whatsapp_utils.py` assist with tasks like sending WhatsApp messages, parsing dates/times, and managing threads.

6. **Frontend**:
   - The Streamlit application in `st_app.py` provides a graphical interface to:
      - Visualize the reservation calendar.
      - Manage reservations (create, update, delete).
      - View conversation histories.
      - Send manual messages via WhatsApp.
   - Authentication is handled in `frontend/__init__.py` using `streamlit_authenticator`. The credentials are stored in `users.yaml`. For more details, refer to [Streamlit Authenticator documentation](https://github.com/mkhorasani/Streamlit-Authenticator).

7. **Automated Reminders**:
   - The `send_reminders.py` script periodically checks the database for upcoming reservations and sends reminders to users via WhatsApp.

8. **Automated Database Backup**:
   - The `sqlite_backup.sh` script creates a backup of the SQLite database to a remote google drive folder.

## Setup and Installation

To set up and run the application:

# AI WhatsApp Bot Setup Guide

## 1. Clone the Repository

```bash
git clone https://github.com/your-repo/ai-whatsapp-bot.git
cd ai-whatsapp-bot
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

## 3. Configure Environment Variables

Create a `.env` file based on `example.env` and update the necessary variables:

- `OPENAI_API_KEY`: Your OpenAI API key.
- `OPENAI_ASSISTANT_ID`: Your OpenAI Assistant ID.
- `VEC_STORE_ID`: Vector store ID for OpenAI retrieval.
- `ACCESS_TOKEN`: WhatsApp API access token.
- `PHONE_NUMBER_ID`: WhatsApp phone number ID.
- `VERIFY_TOKEN`: Webhook verification token.
- `APP_ID` and `APP_SECRET`: Meta app credentials.
- `BUSINESS_LATITUDE`, `BUSINESS_LONGITUDE`, `BUSINESS_NAME`, `BUSINESS_ADDRESS`: Business location details.
- `SYSTEM_PROMPT`: System prompt for Anthropic.
- `ANTHROPIC_API_KEY`: Your Anthropic API key.

## 4. Run the FastAPI Application

```bash
python run.py
```

Runs on `http://0.0.0.0:8000` by default.

## 5. Run the Streamlit Frontend

```bash
streamlit run st_app.py
```

Access at `http://localhost:8501` (default Streamlit port).

## 6. Set Up Webhooks

Configure the WhatsApp webhook to point to your FastAPI application's `/webhook` endpoint (e.g., via `ngrok` for local testing).

## 7. Set Up Reminders (Optional)

Run `send_reminders.py` and sqlite_backup.sh manually or schedule them (e.g., via `cron`) to send reminders and back up the database:

```bash
python send_reminders.py
```

```bash
sqlite_backup.sh
```

---

## Dependencies

The project dependencies are listed in `requirements.txt`. Install them using:

```bash
pip install -r requirements.txt
```

### Key Dependencies

- **FastAPI**: Web framework for the API.
- **Uvicorn**: ASGI server to run FastAPI.
- **Streamlit**: Frontend framework.
- **OpenAI**: AI response generation.
- **Anthropic**: AI response generation.
- **requests**: For HTTP requests to the WhatsApp API.
- **aiohttp**: Asynchronous HTTP client/server framework.
- **python-dotenv**: For loading environment variables from `.env` files.

---

## Usage

### WhatsApp Bot

- Once the FastAPI application is running and webhooks are configured, the bot responds automatically to messages received on the configured WhatsApp number.
- Users can send commands to manage reservations (e.g., book, modify, cancel).

### Streamlit Frontend

- Access at `http://localhost:8501`.
- Log in with credentials defined in `users.yaml`.
- View and manage reservations, visualize conversation histories, and send manual WhatsApp messages.

### Reminders

- The `send_reminders.py` script sends automated reminders for reservations scheduled for the next day.

---

## Contributing

Contributions are welcome!

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
