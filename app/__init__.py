from flask import Flask
from app.config import load_configurations, configure_logging
from .views import webhook_blueprint
import subprocess

def create_app():
    app = Flask(__name__)

    # Load configurations and logging settings
    load_configurations(app)
    configure_logging()

    # Import and register blueprints, if any
    app.register_blueprint(webhook_blueprint)
        # Optionally launch the Streamlit app as a background process.
    # Warning: This is not recommended for production.
    try:
        # Launch streamlit_app.py with CORS disabled and on port 8501.
        subprocess.Popen([
            "streamlit", "run", "streamlit_app.py",
            "--server.enableCORS", "false",
            "--server.port", "8501"
        ])
    except Exception as e:
        app.logger.error(f"Failed to launch Streamlit: {e}")
    
    return app
