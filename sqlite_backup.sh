#!/bin/bash

# Config
DB_PATH="/home/ubuntu/python-whatsapp-bot/threads_db.sqlite"
BACKUP_DIR="/home/ubuntu/backups"
BACKUP_NAME="backup_$(date +'%Y-%m-%d_%H-%M-%S').sqlite"
ZIP_NAME="$BACKUP_NAME.zip"
RETENTION_DAYS=7
REMOTE_FOLDER="gdrive:/backups/happybot_sqlite_backups"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Backup SQLite database
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/$BACKUP_NAME'"

# Compress backup
zip -j "$BACKUP_DIR/$ZIP_NAME" "$BACKUP_DIR/$BACKUP_NAME"
rm "$BACKUP_DIR/$BACKUP_NAME"  # Remove uncompressed version

# Upload to Google Drive
rclone copy "$BACKUP_DIR/$ZIP_NAME" "$REMOTE_FOLDER"

# Delete local backups older than 7 days
find $BACKUP_DIR -type f -name "*.zip" -mtime +$RETENTION_DAYS -delete

# Delete old backups from Google Drive (keeping only last 7)
rclone delete "$REMOTE_FOLDER" --min-age ${RETENTION_DAYS}d
