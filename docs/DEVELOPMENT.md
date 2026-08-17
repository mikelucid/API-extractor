# Local Development Setup

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- Docker (optional, for container testing)

## Quick Start

```bash
bash scripts/setup-dev.sh
npm run dev
```

The Vite dev server starts at **http://localhost:5173**.

## Manual Setup

```bash
# Install root dependencies
npm install

# Install agent dependencies
cd cursor-rootv2 && npm install && cd ..

# Copy environment files
cp .env.example .env
cp cursor-rootv2/.env.example cursor-rootv2/.env

# Start dev server
npm run dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run oxlint |
| `bash scripts/build-all.sh` | Build all packages |
| `bash scripts/test-all.sh` | Run all tests |

## Project Structure

```
rootagentv2/
├── src/                    # React/Vite frontend
├── cursor-rootv2/          # CLI agent (TypeScript)
├── packages/shared/        # Shared types/utils
├── infrastructure/aws/     # AWS deployment scripts
├── scripts/                # Utility scripts
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD
```
