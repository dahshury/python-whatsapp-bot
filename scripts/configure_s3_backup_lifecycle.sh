#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 [-b bucket] [-p prefix] [-d days] [--remove] [--preview]

Creates or removes an S3 lifecycle rule to expire database backups produced by
the aws_s3 extension.

Options:
  -b        S3 bucket (defaults to S3_BUCKET env)
  -p        Prefix within bucket (defaults to S3_PREFIX or backups/happybot_pg_backups)
  -d        Retention in days (defaults to S3_RETENTION_DAYS or 7)
  --rule    Lifecycle rule id (defaults to whatsapp-db-backups-retention)
  --remove  Remove the lifecycle rule instead of creating/updating it
  --preview Print the lifecycle JSON but do not call the AWS API
  -h        Show this help message

Environment overrides:
  AWS_REGION / AWS_DEFAULT_REGION are used to select the region.

Examples:
  $0 -d 14            # expire backups after 14 days
  $0 --remove         # delete the lifecycle rule
  $0 --preview -d 30  # show the JSON payload without applying it
USAGE
}

# shellcheck disable=SC2317
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
RETENTION_DAYS="${S3_RETENTION_DAYS:-7}"
RULE_ID="whatsapp-db-backups-retention"
REMOVE_RULE=0
PREVIEW=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b)
      BUCKET="$2"
      shift 2
      ;;
    -p)
      PREFIX="$2"
      shift 2
      ;;
    -d)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --rule)
      RULE_ID="$2"
      shift 2
      ;;
    --remove)
      REMOVE_RULE=1
      shift
      ;;
    --preview)
      PREVIEW=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [ -z "$BUCKET" ]; then
  echo "S3 bucket not provided. Set S3_BUCKET or pass -b." >&2
  exit 1
fi

if [ "$REMOVE_RULE" -eq 1 ]; then
  echo "==> Removing lifecycle rule '$RULE_ID' from bucket $BUCKET"
  if [ "$PREVIEW" -eq 1 ]; then
    echo "aws s3api delete-bucket-lifecycle --bucket $BUCKET"
    exit 0
  fi
  aws s3api delete-bucket-lifecycle --bucket "$BUCKET"
  echo "==> Lifecycle configuration removed"
  exit 0
fi

if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "Retention days must be a positive integer" >&2
  exit 1
fi

PREFIX_VALUE="${PREFIX%%/}"

read -r -d '' LIFECYCLE_JSON <<EOF
{
  "Rules": [
    {
      "ID": "${RULE_ID}",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "${PREFIX_VALUE:+$PREFIX_VALUE/}"
      },
      "Expiration": {
        "Days": ${RETENTION_DAYS}
      }
    }
  ]
}
EOF

echo "==> Applying lifecycle rule '$RULE_ID' to bucket $BUCKET (prefix '${PREFIX_VALUE}')"

if [ "$PREVIEW" -eq 1 ]; then
  echo "$LIFECYCLE_JSON"
  exit 0
fi

aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --lifecycle-configuration "$LIFECYCLE_JSON"

echo "==> Lifecycle configuration updated"

