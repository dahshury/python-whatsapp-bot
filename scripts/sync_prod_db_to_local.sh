#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 [-b bucket] [-p prefix] [-r region] [-k object_key]

Downloads the most recent PostgreSQL backup from S3 and restores it into the
local docker-compose postgres service.

Flags:
  -b  Override S3 bucket (defaults to S3_BUCKET env)
  -p  Override S3 prefix (defaults to S3_PREFIX or backups/happybot_pg_backups)
  -r  Override AWS region (defaults to AWS_REGION or AWS_DEFAULT_REGION)
  -k  Explicit object key to restore (skips latest lookup)
  -h  Show this help message

Requirements:
  - aws CLI configured with access to the bucket
  - docker compose installed locally
  - Run from the project root (where docker-compose.yml lives)
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

if [ -f .env ]; then
  load_env_file .env
elif [ -f app/.env ]; then
  load_env_file app/.env
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found. Install and configure it before running this script." >&2
  exit 1
fi

BUCKET="${S3_BUCKET:-}"
PREFIX="${S3_PREFIX:-backups/happybot_pg_backups}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"
OBJECT_KEY=""

while getopts ":b:p:r:k:h" opt; do
  case "$opt" in
    b) BUCKET="$OPTARG" ;;
    p) PREFIX="$OPTARG" ;;
    r) REGION="$OPTARG" ;;
    k) OBJECT_KEY="$OPTARG" ;;
    h) usage; exit 0 ;;
    \?) echo "Invalid option: -$OPTARG" >&2; usage; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; usage; exit 1 ;;
  esac
done

if [ -z "$BUCKET" ]; then
  echo "S3 bucket not provided. Set S3_BUCKET or pass -b." >&2
  exit 1
fi

if [ -z "$REGION" ]; then
  echo "AWS region not provided. Set AWS_REGION/AWS_DEFAULT_REGION or pass -r." >&2
  exit 1
fi

if [ -z "$OBJECT_KEY" ]; then
  echo "==> Discovering latest backup object from s3://$BUCKET/$PREFIX"
  PREFIX_PATH="${PREFIX%%/}"
  if [ -n "$PREFIX_PATH" ]; then
    PREFIX_PATH="$PREFIX_PATH/"
  fi

  OBJECT_KEY=$(aws s3api list-objects-v2 \
    --bucket "$BUCKET" \
    --prefix "$PREFIX_PATH" \
    --region "$REGION" \
    --query 'reverse(sort_by(Contents,&LastModified))[:1].[].Key' \
    --output text)

  if [ "$OBJECT_KEY" = "None" ] || [ -z "$OBJECT_KEY" ]; then
    echo "No backups found under s3://$BUCKET/$PREFIX_PATH" >&2
    exit 2
  fi
else
  echo "==> Using specified object key: $OBJECT_KEY"
fi

mkdir -p ./backups
LOCAL_NAME=$(basename "$OBJECT_KEY")
LOCAL_PATH="./backups/$LOCAL_NAME"

echo "==> Downloading s3://$BUCKET/$OBJECT_KEY -> $LOCAL_PATH"
aws s3 cp "s3://$BUCKET/$OBJECT_KEY" "$LOCAL_PATH" --region "$REGION"

if [ ! -s "$LOCAL_PATH" ]; then
  echo "Downloaded file is empty or missing: $LOCAL_PATH" >&2
  exit 3
fi

echo "==> Ensuring local postgres service is up (docker compose up -d postgres)"
docker compose up -d postgres

echo "==> Resetting schema (DROP/CREATE public)"
docker compose exec -T postgres psql -U postgres -d whatsapp_bot -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "==> Restoring dump into local postgres"
if [[ "$LOCAL_PATH" == *.gz ]]; then
  gunzip -c "$LOCAL_PATH" | docker compose exec -T postgres psql -U postgres -d whatsapp_bot
else
  cat "$LOCAL_PATH" | docker compose exec -T postgres psql -U postgres -d whatsapp_bot
fi

echo "==> Done. Local database now matches backup: $LOCAL_PATH"


