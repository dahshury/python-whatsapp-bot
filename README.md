# AI-WhatsApp-Reservation-App

![alt text](media/1.png)
![alt text](media/Screenshot%202025-03-14%20014221.png)
![alt text](media/Screenshot%202025-03-14%20014527.png)

A powerful WhatsApp bot built using FastAPI, integrated with multiple AI providers (OpenAI, Anthropic, and Google Gemini) for generating intelligent responses to customer inquiries. The application includes a comprehensive Streamlit frontend for managing reservations and includes a fully containerized setup with Docker for easy deployment.

The bot allows users to make, modify, and cancel reservations via WhatsApp, while the front-end Streamlit application provides a graphical interface for managing reservations, analyzing conversation data, and visualizing business metrics.

For the original repository and setup tutorial (Flask version), please refer to [this GitHub repository](https://github.com/daveebbelaar/python-whatsapp-bot).

## Features

- **Multi-Provider AI Integration**: Flexibility to use OpenAI, Anthropic Claude, or Google Gemini for message generation
- **Docker Containerization**: Complete Docker setup for both development and production environments
- **Monitoring & Metrics**: Prometheus integration with alerting capabilities and Discord notifications
- **Advanced Analytics**: Comprehensive statistics dashboard for business insights
- **Automated Scheduling**: Built-in job scheduler for reminders and database backups
- **Internationalization**: Multi-language support with i18n capabilities
- **High Performance**: Optimized with uvloop for maximum throughput
- **Secure Authentication**: Streamlit authenticator for frontend access control
- **Production-Ready**: Support for production deployment with robust error handling and logging

## Prerequisites

- A Meta developer account. If you don't have one, [create a Meta developer account here](https://developers.facebook.com/).
- A business app. If you don't have one, [learn to create a business app here](https://developers.facebook.com/docs/development/create-an-app/).
- Docker and Docker Compose (for containerized deployment)
- API keys for your chosen AI provider(s): OpenAI, Anthropic, and/or Google Gemini

## Project Structure

```plaintext
├── .github/                  # GitHub workflows and CI configurations
├── .streamlit/               # Streamlit configuration files
├── app/                      # Main application code
│   ├── decorators/           # Decorator functions for security, safety, and metrics
│   ├── frontend/             # Streamlit frontend components with statistics dashboard
│   ├── services/             # Business logic modules for multiple AI providers
│   │   ├── anthropic_service.py  # Anthropic Claude integration
│   │   ├── gemini_service.py     # Google Gemini integration
│   │   ├── openai_service.py     # OpenAI integration
│   │   ├── llm_service.py        # Abstract LLM service interface
│   │   └── assistant_functions.py # Core business logic for reservations
│   ├── utils/                # Utility functions for services and API interactions
│   ├── config.py             # Configuration settings loaded from environment variables
│   ├── db.py                 # Database connection and schema definitions using SQLite
│   ├── i18n.py               # Internationalization support
│   ├── metrics.py            # Prometheus metrics definitions
│   ├── scheduler.py          # Background job scheduler for automated tasks
│   └── views.py              # FastAPI route definitions
├── prometheus/               # Prometheus configuration files
│   ├── prometheus.yml        # Main Prometheus configuration
│   ├── alert_rules.yml       # Alert rules definitions
│   └── alertmanager.yml      # Alert manager configuration
├── scripts/                  # Utility scripts (deploy, backups, reminders)
├── docker-compose.yml        # Development Docker Compose configuration
├── docker-compose.prod.yml   # Production Docker Compose configuration
├── Dockerfile.backend        # Dockerfile for FastAPI backend
├── Dockerfile.frontend       # Dockerfile for Streamlit frontend
├── requirements-backend.in   # Backend dependencies
├── requirements-frontend.in  # Frontend dependencies
├── run.py                    # Entry point to run the FastAPI application
└── README.md                 # Project documentation
```

## Overall Operation

The application operates as follows:

1. **Webhook Handling**:

   - The FastAPI application listens for incoming webhooks from WhatsApp at the `/webhook` endpoint.
   - Incoming requests are verified using signature verification to ensure authenticity.

1. **Message Processing**:

   - When a message is received, it is processed by the appropriate LLM service (OpenAI, Anthropic, or Gemini).
   - The application uses a configurable LLM provider to generate intelligent responses based on message content.

1. **Database Interactions**:

   - The application uses SQLite to store conversation history, reservation details, and thread information.
   - Multiple tables track different aspects of the business operations.

1. **Reservation Management**:

   - Users can interact with the bot via WhatsApp to make, modify, or cancel reservations.
   - Assistant functions handle these operations with natural language understanding.

1. **Monitoring and Metrics**:

   - Prometheus collects and stores metrics on system performance and business operations.
   - Alerts are configured for critical conditions and sent to a Discord channel.

1. **Frontend Dashboard**:

   - The Streamlit application provides multiple views:
     - Calendar view for reservation management
     - Conversation history browser
     - Statistics dashboard with business analytics
     - WhatsApp message sending interface

1. **Automated Tasks**:

   - Background scheduler runs daily to send appointment reminders via WhatsApp.
   - Regular database backups are performed and can be uploaded to remote storage.

## Setup and Installation

### Docker Setup (Recommended)

1. **Clone the Repository**

```bash
git clone https://github.com/your-repo/ai-whatsapp-bot.git
cd ai-whatsapp-bot
```

2. **Configure Environment Variables**

Create a `.env` file based on `.env.example` and update the necessary variables:

```
# AI Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# WhatsApp API Configuration
ACCESS_TOKEN=your_whatsapp_access_token
PHONE_NUMBER_ID=your_whatsapp_phone_id
VERIFY_TOKEN=your_webhook_verify_token
APP_ID=your_meta_app_id
APP_SECRET=your_meta_app_secret

# Business Information
BUSINESS_NAME=your_business_name
BUSINESS_ADDRESS=your_business_address
BUSINESS_LATITUDE=your_latitude
BUSINESS_LONGITUDE=your_longitude

# LLM Configuration
PREFERRED_LLM=openai  # Options: openai, anthropic, gemini
SYSTEM_PROMPT=your_system_prompt

# Monitoring
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

3. **Start the Application with Docker Compose**

For development:

```bash
docker-compose up
```

For production:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Setup (Alternative)

1. **Install Dependencies**

```bash
pip install -r requirements-backend.in
pip install -r requirements-frontend.in
```

2. **Run the FastAPI Application**

```bash
python run.py
```

Runs on `http://0.0.0.0:8000` by default.

3. **Run the Streamlit Frontend**

```bash
streamlit run app/frontend/dashboard.py
```

Access at `http://localhost:8501` (default Streamlit port).

## Webhook Configuration

Configure the WhatsApp webhook to point to your FastAPI application's `/webhook` endpoint. For local testing, you can use ngrok:

```bash
ngrok http 8000
```

Then configure your webhook URL as: `https://your-ngrok-url.ngrok.io/webhook`

## Monitoring and Alerts

The application includes a complete monitoring stack:

1. **Prometheus**: Collects metrics at http://localhost:9090
1. **AlertManager**: Manages alert notifications at http://localhost:9093
1. **Discord Alerts**: Sends formatted alert notifications to Discord

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
1. Create a feature branch
1. Make your changes
1. Submit a pull request

## License

This project is licensed under the MIT License. See the `LICENSE.txt` file for details.
