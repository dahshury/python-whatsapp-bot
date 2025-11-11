#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$PROJECT_ROOT"

printf '\n[manual-backup] ensuring backend container is running...\n'
docker compose up -d backend >/dev/null

printf '\n[manual-backup] executing backup job inside backend container...\n\n'
if docker compose exec -T backend python -m app.scripts.run_database_backup; then
  printf '\n[manual-backup] backup completed successfully.\n\n'
else
  status=$?
  printf '\n[manual-backup] backup failed (exit code %s). See output above for details.\n\n' "$status" >&2
  exit "$status"
fi




















