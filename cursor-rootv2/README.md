# Cursor Rootv2

Local **safety supervisor** for the owner's machine. Watches allowlisted agents, evaluates a constitution gate, contains rogue sessions, stores structured datasets (agents / memory / encrypted identity), and leaves human-readable owner audits.

This package is intentionally separate from the CertForge lab app.

## Non-goals

- No rootkits, kernel extensions, LaunchDaemons, or stealth persistence
- No silent stranger biometric / internet-wide identity scraping
- No assistance for hacking others, fraud, or crime (constitution fails closed)

## Quick start

```bash
cd cursor-rootv2
npm install
npm test
npm run typecheck
```

CLI (after `npm run build`, or via `npm run cli -- <cmd>`):

```bash
npm run cli -- think --scenario drift
npm run cli -- muse --steps 5
npm run cli -- rehearse --count 5 --think --pace 1200
npm run cli -- status
```

On macOS, `scripts/install-macos.sh` / `scripts/uninstall-macos.sh` install a **user-domain** LaunchAgent under `~/Library/LaunchAgents` and data under `~/Library/Application Support/CursorRootv2/`.

## Datasets

| Store | Path (under data dir) | Purpose |
|-------|----------------------|---------|
| Agents | `datasets/agents.json` | Allowlisted agent profiles (argv/cwd/socket) |
| Memory | `datasets/memory.jsonl` | Structured lessons / incident patterns (no secrets) |
| Identity | `datasets/identity.vault.json` | AES-GCM sealed enrollments + friend ACL |
| Policy | in-code defaults | Detector rules with confidence thresholds |

Fixture seeds live in `src/datasets/fixtures.ts` for tests and rehearsal.

## Agents

- **SupervisorAgent** — constitution gate, registry, session watch, memory, **`decide()`** loop
- **AgentRegistry** — allowlist CRUD backed by the agents dataset
- **SessionWatcher** — ignore non-allowlisted processes; live ratio + quantized swing → contain
- **ContainmentService** — SIGTERM → SIGKILL → quarantine + audit

### Decision upgrade (from DeepSeek extracts)

See [`docs/UPGRADE_BRIEF.md`](./docs/UPGRADE_BRIEF.md), [`docs/NEURAL_RASTER_RATIO.md`](./docs/NEURAL_RASTER_RATIO.md), [`docs/MATH_THINKING_AI.md`](./docs/MATH_THINKING_AI.md), [`docs/ART_FROM_MATH.md`](./docs/ART_FROM_MATH.md), and [`docs/DECENTRALIZED_LLM_NOTES.md`](./docs/DECENTRALIZED_LLM_NOTES.md).

Added local router, tool catalog (optional SD stub), provider fallback/circuit breaker, **grid live rasterizer + pure-TS MLP probability-ratio decisions**, **Mathematical Thinking AI** (explicit centroid/covariance/Gaussian \(R\) + horizon simulate), quantized swing hysteresis, thought–plan–critique loop, escalation gate, and local Interaction/Wire loggers (UUID + domain; **no** torrent/DHT). Memory lessons restore optional `rating` / `decisionRatio`.

## Identity

Friend-gated resolve only. Mutual friends can read allowed fields; non-friends are denied. Audits record access **metadata**, never identity payload bodies.

## Sandbox

Ephemeral workdirs with blocked path prefixes. Capability is labeled honestly in audits (`cwd+env jail`); this is not claimed to be unbreakable.
