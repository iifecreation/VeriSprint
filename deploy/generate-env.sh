#!/usr/bin/env bash
# Creates deploy/.env from .env.example with strong random secrets.
# Usage: ./generate-env.sh yourdomain.com
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  echo "deploy/.env already exists — refusing to overwrite it (it holds your secrets)." >&2
  exit 1
fi
domain="${1:-}"
if [ -z "$domain" ]; then
  echo "Usage: ./generate-env.sh yourdomain.com" >&2
  exit 1
fi

# Hex secrets: long, random, and safe to embed in URLs (no special characters).
rand() { openssl rand -hex "$1"; }

umask 077
sed \
  -e "s|^DOMAIN=.*|DOMAIN=${domain}|" \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(rand 32)|" \
  -e "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$(rand 32)|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=$(rand 48)|" \
  -e "s|^SESSION_SECRET=.*|SESSION_SECRET=$(rand 48)|" \
  -e "s|^GITHUB_WEBHOOK_SECRET=.*|GITHUB_WEBHOOK_SECRET=$(rand 32)|" \
  .env.example > .env
chmod 600 .env

echo "Created deploy/.env for ${domain} with random secrets (readable only by you)."
echo "Next: open deploy/.env and fill in the GitHub App, ANTHROPIC_API_KEY and RESEND_API_KEY values."
echo "Use the GITHUB_WEBHOOK_SECRET it generated as the webhook secret in your GitHub App settings."
