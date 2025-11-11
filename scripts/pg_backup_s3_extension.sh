#!/usr/bin/env bash
set -euo pipefail

# Load environment variables from .env file
load_env_file() {
  local env_file="$1"
  [ -f "$env_file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"; line="${line#"${line%%[![:space:]]*}"}"; line="${line%"${line##*[![:space:]]}"}"
    [ -z "$line" ] && continue
    case "$line" in \#*) continue ;; esac
    local key val
    if printf '%s\n' "$line" | grep -Eq '^(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*[[:space:]]*='; then
      key="${line%%=*}"; val="${line#*=}"
    else
      continue
    fi
    case "$key" in export[[:space:]]*) key="${key#export }" ;; esac
    key="${key#"${key%%[![:space:]]*}"}"; key="${key%"${key##*[![:space:]]}"}"
    val="${val#"${val%%[![:space:]]*}"}"; val="${val%"${val##*[![:space:]]}"}"
    if [ "${val#\"}" != "$val" ] && [ "${val%\"}" != "$val" ]; then val="${val#\"}"; val="${val%\"}"; fi
    if [ "${val#\'}" != "$val" ] && [ "${val%\'}" != "$val" ]; then val="${val#\'}"; val="${val%\'}"; fi
    if printf '%s\n' "$key" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'; then export "$key=$val"; fi
  done < "$env_file"
}

# Load .env file
if [ -f ".env" ]; then
  load_env_file ".env"
elif [ -f "/app/.env" ]; then
  load_env_file "/app/.env"
fi

# Validate required variables
if [ -z "${S3_BUCKET:-}" ]; then
  echo "Error: S3_BUCKET is not set in .env file" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set in .env file" >&2
  exit 1
fi

# Set defaults
S3_PREFIX="${S3_PREFIX:-backups/happybot_pg_backups}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
S3_SSE="${S3_SSE:-AES256}"
PG_DUMP_COMPRESSION="${PG_DUMP_COMPRESSION:-gzip}"

# Normalize DATABASE_URL for PostgreSQL (remove driver prefix)
# Since we're running inside the postgres container, use localhost
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/whatsapp_bot}"
DB_URL="${DB_URL/postgresql+psycopg:\/\//postgresql://}"
DB_URL="${DB_URL/postgresql+asyncpg:\/\//postgresql://}"
DB_URL="${DB_URL/postgresql+psycopgbinary:\/\//postgresql://}"
# Replace service name with localhost for container-internal connection
DB_URL="${DB_URL/@postgres:/@localhost:}"

# Escape single quotes for SQL (double them)
escape_sql() {
  echo "$1" | sed "s/'/''/g"
}

# Build object key with timestamp
TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')
OBJECT_KEY="${S3_PREFIX}/pgdump_whatsapp_bot_${TIMESTAMP}.sql.gz"

# Build SQL query with proper NULL handling
SQL_PARAMS=(
  "'$(escape_sql "${DB_URL}")'"
  "'$(escape_sql "${S3_BUCKET}")'"
  "'$(escape_sql "${OBJECT_KEY}")'"
  "'$(escape_sql "${AWS_REGION}")'"
)

# Add optional parameters (use NULL if empty)
if [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  SQL_PARAMS+=("'$(escape_sql "${AWS_ACCESS_KEY_ID}")'")
else
  SQL_PARAMS+=("NULL")
fi

if [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  SQL_PARAMS+=("'$(escape_sql "${AWS_SECRET_ACCESS_KEY}")'")
else
  SQL_PARAMS+=("NULL")
fi

if [ -n "${AWS_SESSION_TOKEN:-}" ]; then
  SQL_PARAMS+=("'$(escape_sql "${AWS_SESSION_TOKEN}")'")
else
  SQL_PARAMS+=("NULL")
fi

SQL_PARAMS+=("'$(escape_sql "${S3_SSE}")'")

if [ -n "${S3_SSE_KMS_KEY_ID:-}" ]; then
  SQL_PARAMS+=("'$(escape_sql "${S3_SSE_KMS_KEY_ID}")'")
else
  SQL_PARAMS+=("NULL")
fi

if [ -n "${S3_ENDPOINT_URL:-}" ]; then
  SQL_PARAMS+=("'$(escape_sql "${S3_ENDPOINT_URL}")'")
else
  SQL_PARAMS+=("NULL")
fi

if [ -n "${PG_DUMP_OPTIONS:-}" ]; then
  SQL_PARAMS+=("'$(escape_sql "${PG_DUMP_OPTIONS}")'")
else
  SQL_PARAMS+=("NULL")
fi

SQL_PARAMS+=("'$(escape_sql "${PG_DUMP_COMPRESSION}")'")

# Join parameters with commas
SQL_PARAMS_JOINED=$(printf '%s,' "${SQL_PARAMS[@]}" | sed 's/,$//')
SQL_QUERY="SELECT * FROM aws_s3.pg_dump_to_s3(${SQL_PARAMS_JOINED});"

# Execute backup
echo "Starting PostgreSQL backup to S3..."
echo "Bucket: ${S3_BUCKET}"
echo "Object Key: ${OBJECT_KEY}"
echo "Region: ${AWS_REGION}"
echo ""

docker exec reservation_postgres psql -U postgres -d whatsapp_bot -c "${SQL_QUERY}"

echo ""
echo "Backup completed successfully!"

