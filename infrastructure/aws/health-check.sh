#!/usr/bin/env bash
# infrastructure/aws/health-check.sh
# Check application health on EC2
set -euo pipefail

HOST="${EC2_HOST:?EC2_HOST is required}"
PORT="${APP_PORT:-3000}"
RETRIES="${HEALTH_RETRIES:-5}"
WAIT="${HEALTH_WAIT:-10}"

URL="http://$HOST:$PORT/"

echo "==> Health check: $URL"
for i in $(seq 1 "$RETRIES"); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    echo "   [OK] HTTP $STATUS on attempt $i"
    exit 0
  fi
  echo "   [WAIT] HTTP $STATUS on attempt $i/$RETRIES – retrying in ${WAIT}s..."
  sleep "$WAIT"
done

echo "==> Health check FAILED after $RETRIES attempts"
exit 1
