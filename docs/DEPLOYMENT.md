# AWS EC2 Deployment Guide

## Prerequisites

- AWS account with IAM user that has EC2 and ECR permissions
- AWS CLI configured (`aws configure`)
- Docker installed locally
- SSH key pair created in AWS

## Initial EC2 Setup

```bash
export EC2_KEY_NAME=your-keypair-name
bash infrastructure/aws/ec2-setup.sh
```

This creates a security group and launches a `t3.small` Amazon Linux 2023 instance.

## Manual Deployment

```bash
# Build image
docker build -t rootagentv2-web:latest .

# Tag and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag rootagentv2-web:latest <account>.dkr.ecr.<region>.amazonaws.com/rootagentv2-web:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/rootagentv2-web:latest

# Deploy
export EC2_HOST=<ip> SSH_KEY_PATH=~/.ssh/keypair.pem
export DOCKER_IMAGE=<account>.dkr.ecr.<region>.amazonaws.com/rootagentv2-web:latest
bash scripts/deploy-dev.sh
```

## GitHub Actions (Automated)

See [CI-CD.md](CI-CD.md) for automated deployment via GitHub Actions.

## Health Check

```bash
export EC2_HOST=<ip>
bash infrastructure/aws/health-check.sh
```
