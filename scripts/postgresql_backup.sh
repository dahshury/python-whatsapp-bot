#!/bin/bash

# PostgreSQL Database Backup Script
# Replaces the old SQLite backup script

set -e

# Configuration from environment variables or defaults
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-reservation_system}"

# Backup configuration
BACKUP_DIR="./backups/postgresql"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/postgres_backup_${DATE}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL database backup..."
echo "Host: $POSTGRES_HOST"
echo "Port: $POSTGRES_PORT"
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE_COMPRESSED"

# Test PostgreSQL connection first
echo "Testing database connection..."
export PGPASSWORD="$POSTGRES_PASSWORD"

if ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q; then
    echo "❌ Error: Cannot connect to PostgreSQL database"
    echo "Please check your connection settings and ensure PostgreSQL is running"
    exit 1
fi

echo "✅ Database connection successful"

# Create backup using pg_dump
echo "Creating database backup..."
if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --verbose --no-owner --no-privileges --clean --if-exists \
    -f "$BACKUP_FILE"; then
    
    echo "✅ Database backup created successfully"
    
    # Compress the backup file
    echo "Compressing backup file..."
    if gzip "$BACKUP_FILE"; then
        echo "✅ Backup compressed successfully: $BACKUP_FILE_COMPRESSED"
        
        # Get file size
        BACKUP_SIZE=$(du -h "$BACKUP_FILE_COMPRESSED" | cut -f1)
        echo "Backup size: $BACKUP_SIZE"
        
        # Cleanup old backups (keep last 10)
        echo "Cleaning up old backups (keeping last 10)..."
        cd "$BACKUP_DIR"
        ls -t postgres_backup_*.sql.gz | tail -n +11 | xargs -r rm
        REMAINING_BACKUPS=$(ls postgres_backup_*.sql.gz 2>/dev/null | wc -l)
        echo "Remaining backups: $REMAINING_BACKUPS"
        
        echo ""
        echo "🎉 PostgreSQL backup completed successfully!"
        echo "Backup location: $BACKUP_FILE_COMPRESSED"
        echo "Backup size: $BACKUP_SIZE"
        
    else
        echo "❌ Error: Failed to compress backup file"
        exit 1
    fi
    
else
    echo "❌ Error: Failed to create database backup"
    exit 1
fi

# Cleanup password from environment
unset PGPASSWORD

echo "✅ Backup process completed"
