#!/usr/bin/env bash
# infrastructure/aws/ec2-setup.sh
# Launch and configure an EC2 instance for rootagentv2
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.small}"
AMI_ID="${EC2_AMI_ID:-ami-0c02fb55956c7d316}" # Amazon Linux 2023
KEY_NAME="${EC2_KEY_NAME:?EC2_KEY_NAME is required}"
SG_NAME="rootagentv2-sg"
APP_NAME="rootagentv2"

echo "==> Creating security group $SG_NAME..."
SG_ID=$(aws ec2 create-security-group \
  --group-name "$SG_NAME" \
  --description "Security group for $APP_NAME" \
  --region "$REGION" \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
    --group-names "$SG_NAME" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' --output text)

echo "   Security group: $SG_ID"

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 22 --cidr 0.0.0.0/0 \
  --region "$REGION" 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 3000 --cidr 0.0.0.0/0 \
  --region "$REGION" 2>/dev/null || true

echo "==> Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --count 1 \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME}]" \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' --output text)

echo "   Instance ID: $INSTANCE_ID"
echo "==> Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "==> Instance ready: $PUBLIC_IP"
echo "    SSH: ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@${PUBLIC_IP}"
echo "    App: http://${PUBLIC_IP}:3000"
