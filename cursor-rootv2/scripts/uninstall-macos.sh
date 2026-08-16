#!/usr/bin/env bash
# Removes user LaunchAgent plist; pass --purge-data to delete Application Support dir.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node --import tsx "$ROOT/src/cli-entry.ts" uninstall "$@"
