#!/usr/bin/env bash
# infrastructure/aws/health-check.sh
# Check application health using wait-on (npx wait-on)
set -euo pipefail

HOST="${EC2_HOST:?EC2_HOST is required}"
PORT="${APP_PORT:-3000}"
TIMEOUT="${HEALTH_TIMEOUT:-60000}"

URL="http://$HOST:$PORT/"

echo "==> Health check: $URL (timeout ${TIMEOUT}ms)"
npx --yes wait-on --timeout "$TIMEOUT" "$URL"
echo "   [OK] $URL is up"
