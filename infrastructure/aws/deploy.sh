#!/usr/bin/env bash
# infrastructure/aws/deploy.sh
# Deploy Docker image to EC2
set -euo pipefail

EC2_HOST="${EC2_HOST:?EC2_HOST is required}"
EC2_USER="${EC2_USER:-ec2-user}"
SSH_KEY="${SSH_KEY_PATH:?SSH_KEY_PATH is required}"
IMAGE="${DOCKER_IMAGE:?DOCKER_IMAGE is required}"
APP_NAME="rootagentv2-web"
ENV_FILE="/opt/rootagentv2/.env"

echo "==> Deploying $IMAGE to $EC2_HOST..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" bash <<EOF
  set -e
  echo "-- Pulling image $IMAGE"
  docker pull "$IMAGE"
  echo "-- Stopping old container"
  docker stop "$APP_NAME" 2>/dev/null || true
  docker rm "$APP_NAME" 2>/dev/null || true
  echo "-- Starting new container"
  docker run -d \\
    --name "$APP_NAME" \\
    -p 3000:3000 \\
    --env-file "$ENV_FILE" \\
    --restart unless-stopped \\
    "$IMAGE"
  echo "-- Done"
EOF

echo "==> Deployment complete. Verify: http://$EC2_HOST:3000"
