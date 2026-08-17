#!/usr/bin/env bash
# scripts/build-all.sh — Build all packages
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Building web..."
npm run build

echo "==> Building agent..."
cd cursor-rootv2 && npm run build && cd "$ROOT"

echo "✅ All packages built."
