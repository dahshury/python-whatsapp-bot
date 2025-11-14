#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 [-b bucket] [-p prefix] [-r region] [-k object_key] [-l limit]

Downloads a PostgreSQL backup from S3 (selected interactively) and restores it
into the local docker-compose postgres service.

Flags:
  -b  Override S3 bucket (defaults to S3_BUCKET env)
  -p  Override S3 prefix (defaults to S3_PREFIX or backups/happybot_pg_backups)
  -r  Override AWS region (defaults to AWS_REGION or AWS_DEFAULT_REGION)
  -k  Explicit object key to restore (skips interactive selection)
  -l  Limit number of backups to show (default: 20)
  -h  Show this help message

Requirements:
  - aws CLI configured with access to the bucket
  - docker compose installed locally
  - fzf (optional, for interactive arrow-key selection) - install via: winget install junegunn.fzf
  - Run from the project root (where docker-compose.yml lives)
  - Works on Windows via Git Bash

Environment Variables (from .env):
  - S3_BUCKET: S3 bucket name
  - S3_PREFIX: S3 prefix path (default: backups/happybot_pg_backups)
  - AWS_REGION or AWS_DEFAULT_REGION: AWS region
  - AWS_ACCESS_KEY_ID: AWS access key (if not using AWS CLI credentials)
  - AWS_SECRET_ACCESS_KEY: AWS secret key (if not using AWS CLI credentials)
USAGE
}

load_env_file() {
  local env_file="$1"
  [ -f "$env_file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    line="${line%$'\r'}"
    line="${line#${line%%[![:space:]]*}}"
    line="${line%${line##*[![:space:]]}}"
    [ -z "$line" ] && continue
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line"
    fi
  done <"$env_file"
}

# Load .env file
if [ -f .env ]; then
  load_env_file .env
elif [ -f app/.env ]; then
  load_env_file app/.env
fi

BUCKET="${S3_BUCKET:-}"
PREFIX="${S3_PREFIX:-backups/happybot_pg_backups}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"
OBJECT_KEY=""
LIMIT="${LIMIT:-20}"

while getopts ":b:p:r:k:l:h" opt; do
  case "$opt" in
    b) BUCKET="$OPTARG" ;;
    p) PREFIX="$OPTARG" ;;
    r) REGION="$OPTARG" ;;
    k) OBJECT_KEY="$OPTARG" ;;
    l) LIMIT="$OPTARG" ;;
    h) usage; exit 0 ;;
    \?) echo "Invalid option: -$OPTARG" >&2; usage; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; usage; exit 1 ;;
  esac
done

# Check for AWS CLI after processing help option
# Add common Windows installation paths to PATH if AWS CLI not found
if ! command -v aws >/dev/null 2>&1; then
  # Try common Windows installation locations
  if [ -f "/c/Program Files/Amazon/AWSCLIV2/aws.exe" ]; then
    export PATH="/c/Program Files/Amazon/AWSCLIV2:$PATH"
  elif [ -f "/c/Program Files (x86)/Amazon/AWSCLIV2/aws.exe" ]; then
    export PATH="/c/Program Files (x86)/Amazon/AWSCLIV2:$PATH"
  fi
  
  if ! command -v aws >/dev/null 2>&1; then
    echo "Error: aws CLI not found. Install and configure it before running this script." >&2
    echo "Install via: winget install Amazon.AWSCLI" >&2
    exit 1
  fi
fi

# Check for fzf (for interactive selection)
if ! command -v fzf >/dev/null 2>&1; then
  # Try common Windows installation locations
  FZF_PATHS=(
    "$HOME/.fzf/bin/fzf.exe"
    "/c/Users/$USER/.fzf/bin/fzf.exe"
    "/c/Users/$USER/AppData/Local/Microsoft/WinGet/Packages/junegunn.fzf_Microsoft.Winget.Source_*/fzf.exe"
  )
  
  FZF_FOUND=false
  for fzf_path in "${FZF_PATHS[@]}"; do
    # Handle glob patterns
    for expanded_path in $fzf_path; do
      if [ -f "$expanded_path" ]; then
        FZF_DIR=$(dirname "$expanded_path")
        export PATH="$FZF_DIR:$PATH"
        FZF_FOUND=true
        break 2
      fi
    done
  done
  
  if ! command -v fzf >/dev/null 2>&1; then
    echo "Warning: fzf not found. Falling back to numbered selection." >&2
    echo "Install via: winget install junegunn.fzf" >&2
    USE_FZF=false
  else
    USE_FZF=true
  fi
else
  USE_FZF=true
fi

if [ -z "$BUCKET" ]; then
  echo "Error: S3 bucket not provided. Set S3_BUCKET in .env or pass -b." >&2
  exit 1
fi

if [ -z "$REGION" ]; then
  echo "Error: AWS region not provided. Set AWS_REGION/AWS_DEFAULT_REGION in .env or pass -r." >&2
  exit 1
fi

# Check if Docker is running
echo "==> Checking if Docker is running..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is not installed or not in PATH." >&2
  exit 1
fi

# Test Docker connectivity
if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker Desktop and try again." >&2
  exit 1
fi

# Check if docker compose is available
if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose is not available. Please ensure Docker Compose is installed." >&2
  exit 1
fi

echo "==> Docker is running ✓"
echo ""

# Normalize prefix (ensure it ends with / for listing)
PREFIX_PATH="${PREFIX%%/}"
if [ -n "$PREFIX_PATH" ]; then
  PREFIX_PATH="$PREFIX_PATH/"
fi

# If object key is provided, skip selection
if [ -n "$OBJECT_KEY" ]; then
  echo "==> Using specified object key: $OBJECT_KEY"
else
  echo "==> Listing available backups from s3://$BUCKET/$PREFIX_PATH"
  echo ""
  
  # List objects and format them nicely
  # Get objects sorted by LastModified (newest first)
  BACKUP_LIST=$(aws s3api list-objects-v2 \
    --bucket "$BUCKET" \
    --prefix "$PREFIX_PATH" \
    --region "$REGION" \
    --query "reverse(sort_by(Contents,&LastModified))[:${LIMIT}].[Key,LastModified,Size]" \
    --output text 2>/dev/null)
  
  if [ -z "$BACKUP_LIST" ] || [ "$BACKUP_LIST" = "None" ]; then
    echo "Error: No backups found under s3://$BUCKET/$PREFIX_PATH" >&2
    exit 2
  fi
  
  # Ensure backups directory exists for temp file if needed
  mkdir -p ./backups
  
  # Create temp file (compatible with Windows Git Bash)
  if command -v mktemp >/dev/null 2>&1; then
    TEMP_FILE=$(mktemp)
  else
    TEMP_FILE="./backups/.restore_list_$$.tmp"
  fi
  echo "$BACKUP_LIST" > "$TEMP_FILE"
  
  # Parse backups and prepare for selection
  if [ "$USE_FZF" = true ]; then
    # Use fzf for interactive selection with arrow keys
    echo "==> Loading backups for selection..."
    echo ""
    
    # Build fzf input: format as "filename | date | size | object_key"
    FZF_INPUT=""
    while IFS=$'\t' read -r key date size || [ -n "$key" ]; do
      # Trim whitespace from all fields
      key=$(echo "$key" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
      date=$(echo "$date" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
      size=$(echo "$size" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
      
      if [ -z "$key" ] || [ "$key" = "None" ]; then
        continue
      fi
      
      # Format date for display
      if echo "$date" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'; then
        DISPLAY_DATE=$(echo "$date" | sed 's/T/ /; s/\.[0-9]*Z$//; s/Z$//; s/[+-][0-9][0-9]:[0-9][0-9]$//')
      else
        DISPLAY_DATE="$date"
      fi
      
      # Format size
      size_clean=$(echo "$size" | tr -d '[:space:]' | grep -oE '^[0-9]+' || echo "")
      if [ -z "$size_clean" ]; then
        SIZE_DISPLAY="unknown"
      else
        SIZE_KB=$((size_clean / 1024))
        SIZE_MB=$((size_clean / 1024 / 1024))
        if [ $SIZE_MB -gt 0 ]; then
          SIZE_DISPLAY="${SIZE_MB}MB"
        elif [ $SIZE_KB -gt 0 ]; then
          SIZE_DISPLAY="${SIZE_KB}KB"
        else
          SIZE_DISPLAY="${size_clean}B"
        fi
      fi
      
      FILENAME=$(basename "$key")
      # Format: "filename | date | size | object_key"
      FZF_INPUT="${FZF_INPUT}${FILENAME} | ${DISPLAY_DATE} | ${SIZE_DISPLAY} | ${key}"$'\n'
    done < "$TEMP_FILE"
    rm -f "$TEMP_FILE"
    
    if [ -z "$FZF_INPUT" ]; then
      echo "Error: No valid backups found." >&2
      exit 2
    fi
    
    # Use fzf with preview and extract object_key from selected line
    SELECTED_LINE=$(echo "$FZF_INPUT" | fzf \
      --height=15 \
      --header="Select backup to restore (↑↓ to navigate, Enter to select, Esc to cancel)" \
      --preview='echo {} | awk -F " | " "{print \"Backup: \" \$1 \"\nDate: \" \$2 \"\nSize: \" \$3 \"\nFull path: \" \$4}"' \
      --preview-window=right:50% \
      --border \
      --ansi)
    
    if [ -z "$SELECTED_LINE" ]; then
      echo "Cancelled."
      exit 0
    fi
    
    # Extract object_key (last field after |)
    # Format is: "filename | date | size | object_key"
    # Use cut with pipe delimiter and trim whitespace
    OBJECT_KEY=$(echo "$SELECTED_LINE" | cut -d'|' -f4 | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    SELECTED_DATE=$(echo "$SELECTED_LINE" | cut -d'|' -f2 | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    SELECTED_SIZE=$(echo "$SELECTED_LINE" | cut -d'|' -f3 | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    
    echo ""
    echo "==> Selected: $(basename "$OBJECT_KEY")"
    echo "    Date: $SELECTED_DATE"
    echo "    Size: $SELECTED_SIZE"
    echo ""
  else
    # Fallback to numbered selection
    echo "Available backups (newest first):"
    echo "----------------------------------------"
    INDEX=1
    
    while IFS=$'\t' read -r key date size || [ -n "$key" ]; do
      # Trim whitespace from all fields
      key=$(echo "$key" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
      date=$(echo "$date" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
      size=$(echo "$size" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
      
      if [ -z "$key" ] || [ "$key" = "None" ]; then
        continue
      fi
      
      # Store in arrays (using eval for compatibility with older bash)
      eval "BACKUP_KEYS_$INDEX=\"$key\""
      eval "BACKUP_DATES_$INDEX=\"$date\""
      eval "BACKUP_SIZES_$INDEX=\"$size\""
      
      # Format date for display
      if echo "$date" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'; then
        DISPLAY_DATE=$(echo "$date" | sed 's/T/ /; s/\.[0-9]*Z$//; s/Z$//; s/[+-][0-9][0-9]:[0-9][0-9]$//')
      else
        DISPLAY_DATE="$date"
      fi
      
      # Format size
      size_clean=$(echo "$size" | tr -d '[:space:]' | grep -oE '^[0-9]+' || echo "")
      if [ -z "$size_clean" ]; then
        SIZE_DISPLAY="unknown"
      else
        SIZE_KB=$((size_clean / 1024))
        SIZE_MB=$((size_clean / 1024 / 1024))
        if [ $SIZE_MB -gt 0 ]; then
          SIZE_DISPLAY="${SIZE_MB}MB"
        elif [ $SIZE_KB -gt 0 ]; then
          SIZE_DISPLAY="${SIZE_KB}KB"
        else
          SIZE_DISPLAY="${size_clean}B"
        fi
      fi
      
      FILENAME=$(basename "$key")
      printf "%2d) %s\n" "$INDEX" "$FILENAME"
      printf "    Date: %s | Size: %s\n" "$DISPLAY_DATE" "$SIZE_DISPLAY"
      echo ""
      
      INDEX=$((INDEX + 1))
    done < "$TEMP_FILE"
    rm -f "$TEMP_FILE"
    
    TOTAL_BACKUPS=$((INDEX - 1))
    
    if [ $TOTAL_BACKUPS -eq 0 ]; then
      echo "Error: No valid backups found." >&2
      exit 2
    fi
    
    # Prompt for selection
    echo "----------------------------------------"
    echo -n "Select backup to restore (1-$TOTAL_BACKUPS, or 'q' to quit): "
    read -r SELECTION
    
    if [ "$SELECTION" = "q" ] || [ "$SELECTION" = "Q" ]; then
      echo "Cancelled."
      exit 0
    fi
    
    # Validate selection
    if ! [[ "$SELECTION" =~ ^[0-9]+$ ]]; then
      echo "Error: Invalid selection. Please enter a number." >&2
      exit 1
    fi
    
    if [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt $TOTAL_BACKUPS ]; then
      echo "Error: Selection out of range. Please choose 1-$TOTAL_BACKUPS." >&2
      exit 1
    fi
    
    # Retrieve selected backup info
    eval "OBJECT_KEY=\"\$BACKUP_KEYS_$SELECTION\""
    eval "SELECTED_DATE=\"\$BACKUP_DATES_$SELECTION\""
    eval "SELECTED_SIZE=\"\$BACKUP_SIZES_$SELECTION\""
    
    echo ""
    echo "==> Selected: $(basename "$OBJECT_KEY")"
    echo "    Date: $SELECTED_DATE"
    echo "    Size: $SELECTED_SIZE bytes"
    echo ""
  fi
fi

# Create backups directory if it doesn't exist
mkdir -p ./backups
LOCAL_NAME=$(basename "$OBJECT_KEY")
LOCAL_PATH="./backups/$LOCAL_NAME"

# Download backup
echo "==> Downloading s3://$BUCKET/$OBJECT_KEY -> $LOCAL_PATH"
if ! aws s3 cp "s3://$BUCKET/$OBJECT_KEY" "$LOCAL_PATH" --region "$REGION"; then
  echo "Error: Failed to download backup from S3." >&2
  exit 3
fi

if [ ! -s "$LOCAL_PATH" ]; then
  echo "Error: Downloaded file is empty or missing: $LOCAL_PATH" >&2
  exit 3
fi

echo "==> Download completed successfully"
echo ""

# Ensure postgres service is running
echo "==> Ensuring local postgres service is up..."
if ! docker compose up -d postgres; then
  echo "Error: Failed to start postgres service." >&2
  exit 4
fi

# Wait for postgres to be ready
echo "==> Waiting for postgres to be ready..."
RETRIES=30
while [ $RETRIES -gt 0 ]; do
  if docker compose exec -T postgres pg_isready -U postgres -d whatsapp_bot >/dev/null 2>&1; then
    break
  fi
  RETRIES=$((RETRIES - 1))
  sleep 1
done

if [ $RETRIES -eq 0 ]; then
  echo "Error: Postgres did not become ready in time." >&2
  exit 4
fi

# Confirm before restoring (destructive operation)
echo ""
echo "WARNING: This will REPLACE your current local database with the backup!"
echo "Current database will be completely wiped."
echo ""
echo -n "Are you sure you want to continue? (yes/no): "
read -r CONFIRM

# Normalize input: convert to lowercase and trim whitespace
CONFIRM_NORMALIZED=$(echo "$CONFIRM" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')

# Accept various positive responses: yes, y, 1, true, ok, etc.
case "$CONFIRM_NORMALIZED" in
  yes|y|1|true|ok|okay|sure|yeah|yep|affirmative|proceed|continue|go)
    echo "Proceeding with restore..."
    ;;
  *)
    echo "Restore cancelled."
    exit 0
    ;;
esac

# Reset schema
echo ""
echo "==> Resetting schema (DROP/CREATE public)..."
if ! docker compose exec -T postgres psql -U postgres -d whatsapp_bot -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; then
  echo "Error: Failed to reset schema." >&2
  exit 5
fi

# Restore dump
echo "==> Restoring dump into local postgres..."
if [[ "$LOCAL_PATH" == *.gz ]]; then
  if ! gunzip -c "$LOCAL_PATH" | docker compose exec -T postgres psql -U postgres -d whatsapp_bot; then
    echo "Error: Failed to restore database from compressed dump." >&2
    exit 6
  fi
else
  if ! cat "$LOCAL_PATH" | docker compose exec -T postgres psql -U postgres -d whatsapp_bot; then
    echo "Error: Failed to restore database from dump." >&2
    exit 6
  fi
fi

echo ""
echo "==> Done! Local database has been restored from backup:"
echo "    Backup: $LOCAL_PATH"
echo "    Source: s3://$BUCKET/$OBJECT_KEY"
echo ""
echo "You can now use your local database with the restored data."

