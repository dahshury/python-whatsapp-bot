FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY setup.py requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -e .

# Copy application code
COPY . .

# Expose FastAPI and Streamlit ports
EXPOSE 8000 8501

# Default command runs the FastAPI app; scheduler starts automatically
CMD ["uvicorn", "app:create_app", "--host", "0.0.0.0", "--port", "8000"] 