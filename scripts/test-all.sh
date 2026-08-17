#!/usr/bin/env bash
# scripts/test-all.sh — Run all tests
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Running agent tests..."
cd cursor-rootv2 && npm test && cd "$ROOT"

echo "✅ All tests passed."
