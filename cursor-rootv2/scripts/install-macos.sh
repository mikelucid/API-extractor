#!/usr/bin/env bash
# User-domain LaunchAgent install helper (macOS). Prefer: npx cursor-rootv2 install
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export CURSOR_ROOTV2_DATA_DIR="${CURSOR_ROOTV2_DATA_DIR:-$HOME/Library/Application Support/CursorRootv2}"
node --import tsx "$ROOT/src/cli-entry.ts" install "$@"
