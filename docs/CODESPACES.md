# GitHub Codespaces Guide

## Opening in Codespaces

1. Go to the repository on GitHub
2. Click **Code** → **Codespaces** → **Create codespace on main**

The container uses `mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm` and automatically runs `npm install` after creation.

## Forwarded Ports

| Port | Service |
|------|---------|
| 5173 | Vite dev server |
| 3000 | Frontend (built/preview) |
| 3001 | Backend API |

## Starting Development

```bash
npm run dev
```

Vite dev server starts on port 5173. Codespaces will prompt to open in browser.

## Included Tools

- Node.js 20 + npm
- Git
- Docker-in-Docker
- AWS CLI
- VS Code extensions: ESLint, Prettier, Tailwind CSS IntelliSense, Docker, AWS Toolkit
