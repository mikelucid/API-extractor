#!/usr/bin/env bash
# scripts/deploy-dev.sh — Deploy to dev EC2
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../infrastructure/aws/.env" 2>/dev/null || true

IMAGE="${DOCKER_IMAGE:?Set DOCKER_IMAGE}"
EC2_HOST="${DEV_EC2_HOST:?Set DEV_EC2_HOST}"
SSH_KEY="${SSH_KEY_PATH:?Set SSH_KEY_PATH}"
export EC2_HOST SSH_KEY IMAGE
"$(dirname "${BASH_SOURCE[0]}")/../infrastructure/aws/deploy.sh"
