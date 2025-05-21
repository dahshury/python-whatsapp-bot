#!/bin/bash
et -euo pipefail
# Detect environment - container or host
if [ -f "/.dockerenv" ] || [ -f "/run/.containerenv" ]; then
    # Inside Docker container
    DB_PATH="/app/data/threads_db.sqlite"
    BACKUP_DIR="/app/backups"
else
    # Host environment
    DB_PATH="/home/ubuntu/python-whatsapp-bot/threads_db.sqlite"
    BACKUP_DIR="/home/ubuntu/backups"
fi

# Config
BACKUP_NAME="backup_$(date +'%Y-%m-%d_%H-%M-%S').sqlite"
ZIP_NAME="$BACKUP_NAME.zip"
RETENTION_DAYS=7
REMOTE_FOLDER="gdrive:/backups/happybot_sqlite_backups"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    exit 1
fi

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Backup SQLite database
echo "Backing up database from $DB_PATH to $BACKUP_DIR/$BACKUP_NAME"
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/$BACKUP_NAME'"

# Compress backup
zip -j "$BACKUP_DIR/$ZIP_NAME" "$BACKUP_DIR/$BACKUP_NAME"
rm "$BACKUP_DIR/$BACKUP_NAME"  # Remove uncompressed version

# Upload to Google Drive (only if rclone is available)
if command -v rclone &> /dev/null; then
    echo "Uploading to Google Drive"
    rclone copy "$BACKUP_DIR/$ZIP_NAME" "$REMOTE_FOLDER"
    
    # Delete old backups from Google Drive (keeping only last 7)
    rclone delete "$REMOTE_FOLDER" --min-age ${RETENTION_DAYS}d
else
    echo "Skipping remote upload: rclone not found"
fi

# Delete local backups older than 7 days
find $BACKUP_DIR -type f -name "*.zip" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_DIR/$ZIP_NAME"
