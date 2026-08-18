# Architecture Overview

## System Components

```
┌──────────────────────────────────────────────┐
│                  rootagentv2                 │
│                                              │
│  ┌─────────────┐     ┌────────────────────┐  │
│  │  Web (React)│     │  Agent (cursor-    │  │
│  │  Vite SPA   │     │  rootv2 CLI)       │  │
│  │  Port 5173  │     │  TypeScript        │  │
│  └─────────────┘     └────────────────────┘  │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  packages/shared  (types & utils)       │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
          │ Docker          │ Docker
   ┌──────▼──────┐   ┌──────▼──────────┐
   │  EC2 Dev    │   │  EC2 Production │
   │  (develop)  │   │  (v*.*.* tags)  │
   └─────────────┘   └─────────────────┘
          │ ECR image push via GitHub Actions
   ┌──────▼──────────────────────────────────┐
   │  Amazon ECR — rootagentv2-web repo      │
   └─────────────────────────────────────────┘
```

## Frontend (`src/`)

React 19 single-page application using Vite 8 and React Router 7.
Pages: HomePage, ProjectPage, PathPage, ResumePage.

## Agent (`cursor-rootv2/`)

TypeScript CLI agent with a safety supervisor, constitutional AI pipeline,
allowlisted agents, thought loops, harmonic memory, and sandbox testing.

## Shared (`packages/shared/`)

Common TypeScript types and utilities shared between frontend and agent.

## Infrastructure

- **Docker**: Containerized builds for both web and agent
- **AWS ECR**: Docker image registry
- **AWS EC2**: Runtime hosts for dev and production
- **GitHub Actions**: CI/CD automation
