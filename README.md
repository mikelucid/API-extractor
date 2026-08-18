# rootagentv2

A production-ready TypeScript/React web application with a local AI safety supervisor CLI agent — fully configured for GitHub Codespaces, GitHub Actions CI/CD, and AWS EC2 deployment.

## Quick start

```bash
bash scripts/setup-dev.sh   # install deps, copy .env files, typecheck
npm run dev                 # Vite dev server → http://localhost:5173
```

## Project structure

```
rootagentv2/
├── src/                    # React 19 / Vite 8 frontend (pages, components, data)
├── cursor-rootv2/          # TypeScript CLI agent (supervisor, constitution, memory)
├── packages/shared/        # Shared types via neverthrow
├── infrastructure/aws/     # EC2 setup, deploy, health-check scripts, Terraform SG
├── scripts/                # One-command ops (setup, build, test, deploy)
├── docs/                   # Guides (see below)
├── .devcontainer/          # GitHub Codespaces — Node 20 + Docker + AWS CLI
└── .github/workflows/      # CI/CD pipelines
```

## Documentation

| Guide | Description |
|-------|-------------|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local dev setup |
| [docs/CODESPACES.md](docs/CODESPACES.md) | GitHub Codespaces guide |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | AWS EC2 deployment |
| [docs/CI-CD.md](docs/CI-CD.md) | GitHub Actions workflows |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture overview |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy and commands |

## CI/CD

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | every push / PR | Lint, typecheck, build, agent tests |
| `sandbox-test.yml` | push to `develop` | Integration build + test + artifact |
| `deploy-dev.yml` | push to `develop` | Build → ECR → deploy to dev EC2 |
| `deploy-prod.yml` | `v*.*.*` tag | Build → ECR → deploy to prod EC2 |

## Agent

The [`cursor-rootv2/`](./cursor-rootv2/) CLI is a local safety supervisor with a constitutional AI pipeline, allowlisted agents, thought loops, harmonic memory, and sandbox testing. Run its test suite:

```bash
cd cursor-rootv2 && npm test   # 96 unit tests with vitest
```

## Scripts

```bash
bash scripts/setup-dev.sh       # one-command local setup
bash scripts/build-all.sh       # build web + agent
bash scripts/test-all.sh        # run all tests
bash scripts/deploy-sandbox.sh  # local Docker sandbox
```

