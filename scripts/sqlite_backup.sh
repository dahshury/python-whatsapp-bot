#!/bin/bash
set -euo pipefail

# Structured error reporter
report_error() {
    local stage="$1"; shift
    local code="$1"; shift
    local reason="$1"; shift
    local detail="$*"
    echo "BACKUP_ERROR stage=${stage} code=${code} reason=${reason} detail=${detail}" 1>&2
}

# Trap unhandled errors
trap 'code=$?; report_error "trap" "$code" "unhandled_error" "Script aborted unexpectedly"; exit $code' ERR

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

# Preflight checks
if ! command -v sqlite3 >/dev/null 2>&1; then
    report_error "preflight" 127 "sqlite3_missing" "sqlite3 not found in PATH"
    exit 127
fi

if [ ! -f "$DB_PATH" ]; then
    report_error "preflight" 1 "db_not_found" "Database not found at $DB_PATH"
    echo "Error: Database not found at $DB_PATH"
    exit 1
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Checkpoint WAL before backup to ensure latest pages are merged and WAL truncated
echo "Checkpointing WAL (TRUNCATE) before backup"
if ! sqlite3 "$DB_PATH" 'PRAGMA wal_checkpoint(TRUNCATE);'; then
    report_error "wal_checkpoint" 2 "wal_checkpoint_failed" "Pre-backup wal_checkpoint failed"
fi

# Backup SQLite database
echo "Backing up database from $DB_PATH to $BACKUP_DIR/$BACKUP_NAME"
if ! sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/$BACKUP_NAME'"; then
    report_error "sqlite_backup" 3 "sqlite_backup_failed" "sqlite3 .backup failed"
    exit 3
fi

# Compress backup
if ! zip -j "$BACKUP_DIR/$ZIP_NAME" "$BACKUP_DIR/$BACKUP_NAME"; then
    report_error "compress_zip" 4 "zip_failed" "zip compression failed"
    exit 4
fi
rm "$BACKUP_DIR/$BACKUP_NAME"  # Remove uncompressed version

# Optional: checkpoint again to keep WAL small after backup
echo "Checkpointing WAL (TRUNCATE) after backup"
if ! sqlite3 "$DB_PATH" 'PRAGMA wal_checkpoint(TRUNCATE);'; then
    report_error "wal_checkpoint" 2 "wal_checkpoint_failed" "Post-backup wal_checkpoint failed"
fi

# Upload to S3 if configured and aws CLI is available
if command -v aws &> /dev/null; then
    if [ -n "$S3_BUCKET" ]; then
        echo "Uploading to s3://$S3_BUCKET/$S3_PREFIX/$ZIP_NAME (region: $AWS_REGION)"
        EXTRA_SSE_ARGS=("--sse" "$S3_SSE")
        if [ "$S3_SSE" = "aws:kms" ] && [ -n "$S3_SSE_KMS_KEY_ID" ]; then
            EXTRA_SSE_ARGS+=("--sse-kms-key-id" "$S3_SSE_KMS_KEY_ID")
        fi
        if ! AWS_DEFAULT_REGION="$AWS_REGION" aws s3 cp "$BACKUP_DIR/$ZIP_NAME" "s3://$S3_BUCKET/$S3_PREFIX/$ZIP_NAME" "${EXTRA_SSE_ARGS[@]}"; then
            report_error "s3_upload" 5 "s3_upload_failed" "aws s3 cp failed"
            # Do not exit hard; local backup is still valid
        fi
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
