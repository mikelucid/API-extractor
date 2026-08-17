# Testing Strategy

## Overview

| Layer | Tool | Location |
|-------|------|----------|
| Agent unit tests | vitest | `cursor-rootv2/tests/` |
| Web typecheck | tsc | root |
| Lint | oxlint | root |
| Sandbox integration | CI workflow | `.github/workflows/sandbox-test.yml` |

## Running Tests

```bash
# All tests
bash scripts/test-all.sh

# Agent tests only
cd cursor-rootv2 && npm test

# Watch mode
cd cursor-rootv2 && npm run test:watch

# Typecheck only
npx tsc -b --noEmit
```

## Agent Test Files

- `cursor-rootv2/tests/agents.test.ts` — Agent registry and routing
- `cursor-rootv2/tests/escalation.test.ts` — Escalation policy
- `cursor-rootv2/tests/thought-loop.test.ts` — Thought pipeline

## Adding Tests

New agent tests should be placed in `cursor-rootv2/tests/` and follow the vitest `describe/it/expect` pattern.

## Sandbox Validation

Before deploying to dev, the `sandbox-test.yml` workflow:
1. Builds both web and agent
2. Runs agent unit tests
3. Uploads build artifact for review
