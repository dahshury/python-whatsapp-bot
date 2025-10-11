#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 -i <pem_path> -H <host> [-u <user>] [-p <ssh_port>]

Automates syncing the production Postgres DB to your local Docker Postgres:
  1) Runs a fresh pg_dump in the remote backend container
  2) Copies the dump to this machine via scp
  3) Restores it into the local docker compose "postgres" service

Flags:
  -i  Path to SSH key (PEM)
  -H  Remote host (IP or DNS)
  -u  SSH username (default: ubuntu)
  -p  SSH port (default: 22)

Requirements:
  - Run from the project root (where docker-compose.yml is located)
  - docker and docker compose installed locally
  - ssh/scp available locally
USAGE
}

PEM=""
HOST=""
USER="ubuntu"
SSH_PORT="22"

while getopts ":i:H:u:p:h" opt; do
  case $opt in
    i) PEM="$OPTARG" ;;
    H) HOST="$OPTARG" ;;
    u) USER="$OPTARG" ;;
    p) SSH_PORT="$OPTARG" ;;
    h) usage; exit 0 ;;
    \?) echo "Invalid option: -$OPTARG" >&2; usage; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; usage; exit 1 ;;
  esac
done

if [ -z "$PEM" ] || [ -z "$HOST" ]; then
  echo "Error: -i <pem_path> and -H <host> are required" >&2
  usage
  exit 1
fi

echo "==> Remote: creating fresh dump inside backend container"
ssh -i "$PEM" -p "$SSH_PORT" -o StrictHostKeyChecking=no "$USER@$HOST" bash -lc '
  set -euo pipefail
  CID=$(docker ps -qf name=reservation_backend)
  if [ -z "$CID" ]; then
    echo "reservation_backend container not found on remote host" >&2
    exit 2
  fi
  docker exec -i "$CID" bash -lc "/app/scripts/pg_backup.sh"
  mkdir -p "$HOME/python-whatsapp-bot/backups"
  LATEST=$(docker exec "$CID" bash -lc "ls -1t /app/backups/pgdump_whatsapp_bot_*.sql.gz | head -1")
  if [ -z "$LATEST" ]; then
    echo "No dump file found inside container /app/backups" >&2
    exit 3
  fi
  OUT="$HOME/python-whatsapp-bot/backups/$(basename "$LATEST")"
  docker cp "$CID":"$LATEST" "$OUT"
  echo "$OUT"
' > .sync_remote_path.tmp

REMOTE_FILE=$(tr -d '\r' < .sync_remote_path.tmp | tail -n 1)
rm -f .sync_remote_path.tmp

if [ ! -f "${REMOTE_FILE}" ]; then
  echo "==> Remote dump at: $REMOTE_FILE"
else
  # In case of odd shells printing locally, guard above path not on local FS
  :
fi

mkdir -p ./backups

echo "==> Downloading dump via scp"
scp -i "$PEM" -P "$SSH_PORT" -o StrictHostKeyChecking=no "$USER@$HOST:$REMOTE_FILE" ./backups/

LOCAL_DUMP="$(ls -1t ./backups/pgdump_whatsapp_bot_*.sql.gz | head -1)"
if [ -z "$LOCAL_DUMP" ]; then
  echo "No local dump found under ./backups after scp" >&2
  exit 4
fi
echo "==> Local dump: $LOCAL_DUMP"

echo "==> Ensuring local postgres service is up (docker compose up -d postgres)"
docker compose up -d postgres

echo "==> Resetting schema (DROP/CREATE public)"
docker compose exec -T postgres psql -U postgres -d whatsapp_bot -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "==> Restoring dump into local postgres"
gunzip -c "$LOCAL_DUMP" | docker compose exec -T postgres psql -U postgres -d whatsapp_bot

echo "==> Done. Local database now matches production dump: $LOCAL_DUMP"


