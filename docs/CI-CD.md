# CI/CD Pipeline

## Workflows

### `ci.yml` — Continuous Integration
Triggered on every push and pull request.

- **Lint**: oxlint on frontend code
- **Typecheck**: `tsc -b --noEmit`
- **Build**: `tsc -b && vite build`
- **Agent tests**: vitest for `cursor-rootv2`

### `sandbox-test.yml` — Sandbox Testing
Triggered on push to `develop`.

- Builds web and agent
- Runs integration tests
- Uploads build artifact
- Generates step summary report

### `deploy-dev.yml` — Dev Deployment
Triggered on push to `develop`.

- Authenticates to AWS ECR
- Builds and pushes Docker image tagged `dev-<sha>`
- SSHs to dev EC2, replaces running container
- Runs smoke test (HTTP 200)

### `deploy-prod.yml` — Production Deployment
Triggered on version tags (`v*.*.*`).

- Builds production-optimized image
- Tags as `<version>` and `latest`
- Deploys to prod EC2
- Runs health check
- Posts deployment summary

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_REGION` | AWS region |
| `DEV_EC2_HOST` | Dev EC2 public IP |
| `DEV_EC2_USER` | SSH username |
| `DEV_EC2_SSH_KEY` | SSH private key (PEM) |
| `PROD_EC2_HOST` | Prod EC2 public IP |
| `PROD_EC2_USER` | SSH username |
| `PROD_EC2_SSH_KEY` | SSH private key (PEM) |

See `.github/workflows/.env.secrets.example` for the full template.
