from flask import Flask
from app.config import load_configurations, configure_logging
from .views import webhook_blueprint
import subprocess
import os

def create_app():
    app = Flask(__name__)
    
    # Load configurations and logging.
    load_configurations(app)
    configure_logging()
    
    # Register the existing blueprint.
    app.register_blueprint(webhook_blueprint)
    
    # Determine the absolute path for the Streamlit app file.
    # Update 'streamlit_app.py' if your file is named or located differently.
    streamlit_app_path = os.path.join(os.getcwd(),"app", "streamlit_app.py")
    
    if not os.path.exists(streamlit_app_path):
        app.logger.error(f"Streamlit app file not found at {streamlit_app_path}")
    else:
        try:
            # Launch the Streamlit app as a background process.
            # We disable XSRF protection here to avoid the CORS conflict.
            subprocess.Popen([
                "streamlit", "run", streamlit_app_path,
                "--server.enableCORS", "false",
                "--server.enableXsrfProtection", "false",
                "--server.port", "8501"
            ])
            app.logger.info("Launched Streamlit app from create_app()")
        except Exception as e:
            app.logger.error(f"Failed to launch Streamlit: {e}")
    
    return app
