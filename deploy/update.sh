#!/usr/bin/env bash
# Pull the latest code and redeploy. Migrations run automatically first.
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker image prune -f >/dev/null
docker compose -f docker-compose.prod.yml --env-file .env ps
