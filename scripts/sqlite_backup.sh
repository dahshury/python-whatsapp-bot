#!/bin/bash
set -euo pipefail

# Load environment variables from .env if present
if [ -f "/app/.env" ]; then
    set -a
    . /app/.env
    set +a
elif [ -f ".env" ]; then
    set -a
    . ./.env
    set +a
fi

# Detect environment - container or host
if [ -f "/.dockerenv" ] || [ -f "/run/.containerenv" ]; then
    # Inside Docker container
    DB_PATH="${DB_PATH:-/app/data/threads_db.sqlite}"
    BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
else
    # Host environment (defaults can be overridden by .env)
    DB_PATH="${DB_PATH:-/home/ubuntu/python-whatsapp-bot/threads_db.sqlite}"
    BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
fi

# Config
BACKUP_NAME="backup_$(date +'%Y-%m-%d_%H-%M-%S').sqlite"
ZIP_NAME="$BACKUP_NAME.zip"
RETENTION_DAYS=${RETENTION_DAYS:-7}

# S3 configuration via environment variables
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-backups/happybot_sqlite_backups}"
AWS_REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
S3_SSE="${S3_SSE:-AES256}"
S3_SSE_KMS_KEY_ID="${S3_SSE_KMS_KEY_ID:-}"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    exit 1
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Checkpoint WAL before backup to ensure latest pages are merged and WAL truncated
echo "Checkpointing WAL (TRUNCATE) before backup"
sqlite3 "$DB_PATH" 'PRAGMA wal_checkpoint(TRUNCATE);' || true

# Backup SQLite database
echo "Backing up database from $DB_PATH to $BACKUP_DIR/$BACKUP_NAME"
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/$BACKUP_NAME'"

# Compress backup
zip -j "$BACKUP_DIR/$ZIP_NAME" "$BACKUP_DIR/$BACKUP_NAME"
rm "$BACKUP_DIR/$BACKUP_NAME"  # Remove uncompressed version

# Optional: checkpoint again to keep WAL small after backup
echo "Checkpointing WAL (TRUNCATE) after backup"
sqlite3 "$DB_PATH" 'PRAGMA wal_checkpoint(TRUNCATE);' || true

# Upload to S3 if configured and aws CLI is available
if command -v aws &> /dev/null; then
    if [ -n "$S3_BUCKET" ]; then
        echo "Uploading to s3://$S3_BUCKET/$S3_PREFIX/$ZIP_NAME (region: $AWS_REGION)"
        EXTRA_SSE_ARGS=("--sse" "$S3_SSE")
        if [ "$S3_SSE" = "aws:kms" ] && [ -n "$S3_SSE_KMS_KEY_ID" ]; then
            EXTRA_SSE_ARGS+=("--sse-kms-key-id" "$S3_SSE_KMS_KEY_ID")
        fi
        AWS_DEFAULT_REGION="$AWS_REGION" aws s3 cp "$BACKUP_DIR/$ZIP_NAME" "s3://$S3_BUCKET/$S3_PREFIX/$ZIP_NAME" "${EXTRA_SSE_ARGS[@]}"
        echo "Upload to S3 completed"
    else
        echo "Skipping remote upload: S3_BUCKET is not set in environment/.env"
    fi
else
    echo "Skipping remote upload: aws CLI not found"
fi

# Delete local backups older than RETENTION_DAYS
find "$BACKUP_DIR" -type f -name "*.zip" -mtime +"$RETENTION_DAYS" -delete

echo "Backup completed: $BACKUP_DIR/$ZIP_NAME"
