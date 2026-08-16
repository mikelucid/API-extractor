# Cursor Rootv2 (v1)

User-space **local safety supervisor** for your MacBook. Constitutional, allowlisted, auditable — not a rootkit.

## What it does

- Mature institutional persona (rejects boredom / young-obstinance modes)
- Rule-based constitution blocks aiding hacking of others, fraud, and similar crimes
- Watches **allowlisted** local sessions only
- v1 detectors: `disallowed_host`, `runaway_children`, `blocked_path_touch`
- On high-confidence hits → contain (SIGTERM/SIGKILL intent) + human-readable audit
- Path-jail rehearsal scripts + structured memory
- Friend-gated encrypted local identity (consent enroll only)
- macOS **user** LaunchAgent install (not LaunchDaemon / not root)

## Non-goals

- No silent stranger identification or internet people dossiers
- No kernel extensions, SIP disable, or “become the OS” persistence
- No cloud LLM required for policy in v1
- No menu-bar GUI in v1 (CLI only)

## Setup

```bash
cd cursor-rootv2
npm install
npm test
npm run typecheck
```

```bash
npm run cli -- init
npm run cli -- allowlist add agent-1
npm run cli -- report-event agent-1 disallowed_host --host evil.example --confidence 0.9
npm run cli -- status
npm run cli -- install --dry-run
```

Data dir defaults:

- macOS: `~/Library/Application Support/CursorRootv2`
- Linux/dev: `~/.local/share/cursor-rootv2`

Override with `CURSOR_ROOTV2_DATA_DIR` or `--data-dir`.

## Identity (friends-only)

```bash
npm run cli -- identity enroll ada Ada
npm run cli -- identity enroll bea Bea
npm run cli -- identity friend ada bea
npm run cli -- identity resolve bea ada
```

Audits record allow/deny metadata — not identity payloads.

## Uninstall

```bash
npm run cli -- uninstall --dry-run
npm run cli -- uninstall --purge-data   # macOS real remove when ready
```

## Capability honesty

Sandbox is labeled **path-jail** (ephemeral workdir + blocked paths). It is not a kernel sandbox. Only supervise cooperative allowlisted scripts you trust.
