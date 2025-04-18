#!/bin/bash
cd /home/ubuntu/python-whatsapp-bot || exit 1
echo "$(date): Starting deployment" >> deploy.log
# Ensure scripts are executable
chmod +x scripts/send_reminders.py
chmod +x scripts/sqlite_backup.sh
# Update code to match origin/main
git fetch --all
git reset --hard origin/main
# If using a virtual environment, uncomment the following lines:
source venv/bin/activate
pip install -e .
sudo systemctl restart gunicorn
sudo systemctl restart streamlit-app
echo "$(date): Deployment complete" >> deploy.log
