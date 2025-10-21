#!/usr/bin/env bash
set -euo pipefail

report_error() {
  local stage="$1"; shift
  local code="$1"; shift
  local reason="$1"; shift
  local detail="$*"
  echo "BACKUP_ERROR stage=${stage} code=${code} reason=${reason} detail=${detail}" 1>&2
}

trap 'code=$?; report_error "trap" "$code" "unhandled_error" "Script aborted"; exit $code' ERR

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

if [ -f "/app/.env" ]; then load_env_file "/app/.env"; elif [ -f ".env" ]; then load_env_file ".env"; fi

if ! command -v pg_dump >/dev/null 2>&1; then
  report_error "preflight" 127 "pg_dump_missing" "postgresql-client not installed"
  exit 127
fi

# Parse DATABASE_URL (postgresql:// or postgresql+psycopg://)
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/whatsapp_bot}"
URL_NO_DRIVER="${DB_URL/postgresql+psycopg:\/\//postgresql://}"
URL_NO_DRIVER="${URL_NO_DRIVER/postgresql+asyncpg:\/\//postgresql://}"

# Extract connection params with python for robustness
parse_py='import sys,urllib.parse as u; p=u.urlparse(sys.argv[1]); print("HOST=",p.hostname or "localhost"); print("PORT=",p.port or 5432); print("USER=",p.username or "postgres"); print("PASS=",p.password or ""); print("DB=",(p.path or "/whatsapp_bot").lstrip("/"))'
eval $(python - <<PY "$URL_NO_DRIVER"
$parse_py
PY
)

BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +'%Y-%m-%d_%H-%M-%S')"
FILE_BASENAME="pgdump_${DB}_${STAMP}.sql"
ZIP_NAME="$FILE_BASENAME.gz"
export PGPASSWORD="$PASS"

pg_dump \
  --host "$HOST" \
  --port "$PORT" \
  --username "$USER" \
  --format plain \
  --no-owner \
  --no-privileges \
  "$DB" | gzip -c > "$BACKUP_DIR/$ZIP_NAME"

unset PGPASSWORD

# Optional S3 upload
if command -v aws &>/dev/null && [ -n "${S3_BUCKET:-}" ]; then
  REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
  PREFIX="${S3_PREFIX:-backups/happybot_pg_backups}"
  S3_SSE="${S3_SSE:-AES256}"
  EXTRA_ARGS=(--sse "$S3_SSE")
  if [ "$S3_SSE" = "aws:kms" ] && [ -n "${S3_SSE_KMS_KEY_ID:-}" ]; then EXTRA_ARGS+=(--sse-kms-key-id "$S3_SSE_KMS_KEY_ID"); fi
  AWS_DEFAULT_REGION="$REGION" aws s3 cp "$BACKUP_DIR/$ZIP_NAME" "s3://$S3_BUCKET/$PREFIX/$ZIP_NAME" "${EXTRA_ARGS[@]}" || report_error "s3_upload" 5 "s3_upload_failed" "aws s3 cp failed"
fi

# Retention
RETENTION_DAYS=${RETENTION_DAYS:-7}
find "$BACKUP_DIR" -type f -name "pgdump_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup completed: $BACKUP_DIR/$ZIP_NAME"



