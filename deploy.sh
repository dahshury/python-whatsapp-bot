#!/bin/bash
cd /home/ubuntu/python-whatsapp-bot || exit 1
echo "$(date): Starting deployment" >> deploy.log
git fetch --all
git reset --hard origin/main
# If using a virtual environment, uncomment the following lines:
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart gunicorn
sudo systemctl restart streamlit-app
echo "$(date): Deployment complete" >> deploy.log
