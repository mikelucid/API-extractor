#!/usr/bin/env bash
# scripts/setup-dev.sh — One-command local development setup
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Setting up rootagentv2 development environment..."

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js 20+ is required. Install from https://nodejs.org" && exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "ERROR: Node.js 20+ required (found $NODE_MAJOR)" && exit 1
fi

echo "==> Installing root dependencies..."
npm install

echo "==> Installing agent dependencies..."
cd cursor-rootv2 && npm install && cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example..."
  cp .env.example .env
fi

if [[ ! -f cursor-rootv2/.env ]]; then
  cp cursor-rootv2/.env.example cursor-rootv2/.env
fi

echo "==> Running typecheck..."
npx tsc -b --noEmit

echo ""
echo "✅ Setup complete! Start the dev server with:"
echo "   npm run dev"
