#!/usr/bin/env bash
# scripts/deploy-sandbox.sh — Deploy to sandbox for integration testing
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE_TAG="sandbox-$(git rev-parse --short HEAD)"
echo "==> Building sandbox image: $IMAGE_TAG"
docker build -t "rootagentv2-web:$IMAGE_TAG" .

echo "==> Starting sandbox container..."
docker stop rootagentv2-sandbox 2>/dev/null || true
docker rm rootagentv2-sandbox 2>/dev/null || true
docker run -d --name rootagentv2-sandbox -p 3000:3000 "rootagentv2-web:$IMAGE_TAG"

echo "==> Waiting for app to start..."
npx --yes wait-on --timeout 30000 http://localhost:3000/ && echo "✅ Sandbox healthy at http://localhost:3000"
