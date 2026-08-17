---
title: Cursor Rootv2 Safe Local Supervisor - Plan
type: feat
date: 2026-08-15
deepened: 2026-08-16
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Cursor Rootv2 Safe Local Supervisor - Plan

## Goal Capsule

- **Objective:** Ship v1 of `cursor-rootv2/` — a user-space Node/TypeScript supervisor CLI+daemon for the owner's MacBook that applies a mature constitution, watches allowlisted local sessions, contains confirmed rogue behavior, rehearses scripts in a path jail, and keeps friend-gated local identity with owner-readable audits.
- **Authority:** This plan > product conversation constraints (no rootkits, no silent stranger ID, no crime/hacking aid) > CertForge app (untouched).
- **Stop conditions:** No root/kernel persistence, OS embedding, covert people-ID, internet dossier scraping, LLM cloud dependency for policy, or GUI shells in v1.
- **Execution profile:** Greenfield package; Linux-testable core; darwin install scripts dry-runnable everywhere.
- **Tail ownership:** `cursor-rootv2/**` only.

## Product Contract

### Summary

Cursor Rootv2 v1 is a **local safety supervisor** (CLI + long-running daemon). It acts like a long-tenured operator: no boredom drive, no obstinance passivity. Rule-based constitution fails closed before side effects. When an allowlisted session trips a v1 detector, it diagnoses and contains. Friend-gated identity is local and consent-based. The owner gets a human-readable audit of supervisor actions.

### Problem Frame

Owners need on-device containment for *their* agent sessions without malware, spyware, or a silent identity oracle. v1 delivers the safe core; spectacle features (OS fusion, silent ID) stay rejected.

### Actors

- A1. **Owner** — installs and configures Rootv2.
- A2. **Supervisor** — daemon + CLI policy brain.
- A3. **Watched agent/script** — allowlisted local child/session.
- A4. **Enrolled contact** — opt-in local identity; friends-only read.

### Requirements

#### Persona and constitution

- R1. Mature/institutional persona preamble; boredom and young-obstinance flags are invalid config and rejected at load.
- R2. Constitution blocks assisting hacking of others' computers, fraud, and related crime patterns; denials are structured and owner-visible; **v1 is rule/keyword+pattern based (no cloud LLM required)**.
- R3. On confirmed detector hits in watched sessions, supervisor must contain; persona cannot authorize inaction.

#### Observe → contain

- R4. Owner manages an allowlist of local program/script identities (argv prefix and/or absolute path).
- R5. Supervisor watches only allowlisted supervised children. **v1 detector pack (fixed):** `disallowed_host`, `runaway_children`, `blocked_path_touch`. Extensible interface exists; extra rules are post-v1.
- R6. On hit at/above confidence threshold (default `0.8`), isolate/stop the session and record diagnosis.
- R7. Default-deny local IPC: only Unix socket under the data dir and allowlisted subprocess argv prefixes. No outbound network client in v1 except optional owner-disabled-by-default (shipped **off**; no update channel code in v1).

#### Safe learning

- R8. Rehearsal runs in an ephemeral workdir with blocked absolute prefixes (`/`, `$HOME` outside workdir, data dir). Capability label in audit: `path-jail` (honest: not a kernel sandbox).
- R9. Structured memory stores rehearsal outcomes and incident summaries in supervisor schema; never covert identity scrapes.

#### Friend-gated identity

- R10. Identities only via explicit enroll/add with recorded consent flag.
- R11. Mutual-friend ACL before any field resolve; payloads encrypted at rest (Node `crypto` AES-256-GCM); no public identity dump in audits.
- R12. Separate human-readable audit (JSONL + pretty text) of supervisor actions; identity access logs metadata only.
- R15. No stranger auto-ID, biometrics, or internet scrape importers.

#### Install envelope

- R13. User-domain LaunchAgent + Application Support data dir; never LaunchDaemon/root.
- R14. Uninstall stops agent, removes plist, removes or archives data dir.
- R16. **v1 status surface is CLI only** (`status`, `audit tail`); no menu-bar / Electron / Tauri shell.

### Key Flows

- F1. Install and constitution accept — Covered by: R1, R2, R13, R14, R16
- F2. Observe and contain — Covered by: R3, R4, R5, R6, R12
- F3. Sandboxed rehearsal — Covered by: R8, R9
- F4. Friend-gated identity resolve — Covered by: R10, R11, R12

### Acceptance Examples

- AE1. Crime-aid intent denied (R2) — phishing request → structured refusal, no tool run.
- AE2. Containment on rogue pattern (R3, R5, R6) — supervised child emits `disallowed_host` event ≥0.8 → contained + audit.
- AE3. Friends-only identity (R10, R11) — non-friend resolve denied; no payload in audit.
- AE4. Clean uninstall (R13, R14) — plist and data gone (or archived).
- AE5. Path-jail rehearsal (R8) — script reading `$HOME/.ssh` fails closed; memory records failure.

### Success Criteria

- `cd cursor-rootv2 && npm test && npm run typecheck` pass on Linux CI.
- Core CLI commands work: `init`, `allowlist`, `supervise`/`report-event`, `rehearse`, `identity`, `status`, `install --dry-run`, `uninstall --dry-run`.
- No LaunchDaemon paths in tree.

### Scope Boundaries

**In scope (v1)**
- `cursor-rootv2/` TS package: constitution, audit, allowlist, detectors, contain, path-jail sandbox, memory, identity vault, CLI, darwin install dry-run + scripts.
- In-process / supervised-child model suitable for tests without real `launchctl`.

**Deferred (post-v1)**
- Menu-bar / GUI shell (was Q1 → CLI-only).
- Extra detector packs beyond the three named rules (was Q2 → fixed pack + interface).
- Cloud LLM constitution, auto-updates, Full Disk Access scanners.
- Real `launchctl` load on CI (manual on owner Mac).

**Out of scope (rejected)**
- Rootkits, SIP disable, OS embedding, silent stranger ID, offensive third-party hacking.

### Outstanding Questions

None blocking. Former Q1/Q2 settled in R5/R16.

## Planning Contract

### Assumptions

- Node 20+ available; package uses `"type": "module"`.
- Tests use Node's built-in test runner + `tsx` (or compiled JS); no Vitest required.
- CertForge root `package.json` stays independent (no npm workspaces wiring required); Rootv2 is a sibling folder with its own `package.json`.

### Key Technical Decisions

- KTD1. New package root `cursor-rootv2/` (TypeScript). *(session-settled: user-directed)*
- KTD2. User LaunchAgent + `~/Library/Application Support/CursorRootv2/` only. *(session-settled: user-directed)*
- KTD3. Constitution = versioned pure functions + pattern denylist evaluated before side effects; fail closed. No LLM in v1. *(session-settled: scope-adjust — remove cloud dependency for Mac loadability.)*
- KTD4. Local control socket path under data dir; CLI is the only client in v1.
- KTD5. Sandbox = ephemeral cwd + blocked path prefix checks on declared file ops / rehearsal wrapper; audit capability `path-jail`.
- KTD6. Identity vault = AES-256-GCM with key file `0600` in data dir; mutual friend graph in clear metadata index (no secret fields in index).
- KTD7. Persona = static preamble + rejected flag set `{boredom, young_obstinance}`.
- KTD8. Supervised sessions report events via CLI `report-event` or in-process harness API (tests); v1 does not parse raw OS network tables. *(session-settled: scope-adjust — testable without FDA.)*
- KTD9. Confidence threshold default `0.8`; below threshold → audit `soft_alert` only, no contain.
- KTD10. Thought architecture: one thought kind per chained `src/thoughts/<seq>-<id>/index.ts`; `compile` emits owner-local `<dataDir>/.rootv2/sequence/` frames plus a generated tape stepper (`runtime.mjs`) that does not resemble the TypeScript sources. Dotfolder is owner-visible like `.git`, not covert OS hiding. *(session-settled: user-directed — chained index files as thought patterns that compile into a different-looking sequenced runtime.)*

### High-Level Technical Design

```text
CLI (bin/cursor-rootv2)
  -> thought chain: src/thoughts/00-persona/index.ts ... 08-audit/index.ts
  -> compile: <dataDir>/.rootv2/sequence/*.frame.json + tape.json + runtime.mjs
  -> lib: constitution | allowlist | watch/detectors | contain
        | sandbox | memory | identity | audit | install/macos
  -> data dir: audit.jsonl, audit.txt, allowlist.json, memory.json,
               identity/*, constitution-accept.json, .rootv2/
```

Detector interface (directional, not normative code):

```text
type Detection = { rule: 'disallowed_host'|'runaway_children'|'blocked_path_touch'; confidence: number; detail: string }
evaluate(event, sessionState) -> Detection | null
if confidence >= threshold -> contain(session) + audit
```

### Sequencing

1. U1 skeleton + constitution + persona
2. U2 audit
3. U3 allowlist + detectors + contain
4. U4 sandbox + memory
5. U5 identity
6. U6 install/status/README + CLI wiring
7. U7 thought-pattern chain compile + hidden sequenced runtime

### Risks

- Path-jail is bypassable by a malicious binary → mitigate by only supervising cooperative/allowlisted scripts in v1; document honesty in README.
- Key file theft → `0600` perms + document owner responsibility.
- Over-containment → threshold + soft_alert path (KTD9).

## Implementation Units

### U1. Package skeleton and constitution gate

- **Goal:** Scaffold package; constitution + persona fail closed.
- **Requirements:** R1, R2, R7
- **Files:** `cursor-rootv2/package.json`, `cursor-rootv2/tsconfig.json`, `cursor-rootv2/src/constitution/index.ts`, `cursor-rootv2/src/persona/index.ts`, `cursor-rootv2/src/index.ts`, `cursor-rootv2/tests/constitution.test.ts`
- **Approach:** ESM TS; export `evaluateIntent(text)`; deny patterns for phishing/fraud/unauthorized remote access; persona loader rejects forbidden flags.
- **Test scenarios:**
  - Phishing intent → `{allowed:false, code:'constitution_block'}`.
  - Local diagnose intent → `{allowed:true}`.
  - Persona `{boredom:true}` → throws / returns config error.
- **Verification:** package `npm test` includes this file.

### U2. Owner audit log

- **Goal:** Append-only JSONL + pretty text with identity redaction.
- **Requirements:** R9, R12
- **Files:** `cursor-rootv2/src/audit/index.ts`, `cursor-rootv2/src/paths.ts`, `cursor-rootv2/tests/audit.test.ts`
- **Approach:** `appendAudit(dir, event)`; strip keys `identityPayload`, `secret`, `privateKey`.
- **Test scenarios:**
  - Containment event round-trips fields.
  - Payload keys redacted from both writers.
- **Verification:** unit tests on temp dirs.

### U3. Allowlist, detectors, contain

- **Goal:** Allowlist + three detectors + contain with threshold.
- **Requirements:** R3, R4, R5, R6
- **Files:** `cursor-rootv2/src/allowlist/index.ts`, `cursor-rootv2/src/detect/index.ts`, `cursor-rootv2/src/contain/index.ts`, `cursor-rootv2/src/session/index.ts`, `cursor-rootv2/tests/contain.test.ts`
- **Approach:** In-memory/file allowlist; `handleSessionEvent` runs detectors; contain sets session `quarantined` and records SIGTERM intent (test double for kill).
- **Test scenarios:**
  - Non-allowlisted id ignored.
  - `disallowed_host` @0.9 → quarantined + audit.
  - Event @0.5 → soft_alert, not quarantined.
- **Verification:** contain.test.ts.

### U4. Sandbox rehearsal and structured memory

- **Goal:** Path-jail rehearsal + memory records.
- **Requirements:** R8, R9
- **Files:** `cursor-rootv2/src/sandbox/index.ts`, `cursor-rootv2/src/memory/index.ts`, `cursor-rootv2/tests/sandbox.test.ts`
- **Approach:** Create temp workdir; `assertAllowedPath`; run node script only if paths pass; write memory entry.
- **Test scenarios:**
  - Blocked `$HOME` path → fail + memory failure record.
  - Workdir-local write → success memory record.
- **Verification:** sandbox.test.ts.

### U5. Friend-gated identity vault

- **Goal:** Enroll, friend edges, encrypted resolve.
- **Requirements:** R10, R11, R12, R15
- **Files:** `cursor-rootv2/src/identity/index.ts`, `cursor-rootv2/tests/identity.test.ts`
- **Approach:** AES-GCM blobs; index of ids+friends; `resolve(viewer, subject)` ACL; no scrape API exports.
- **Test scenarios:**
  - Non-friend denied.
  - Mutual friends get fields.
  - Module exports omit scrape/discover symbols.
- **Verification:** identity.test.ts.

### U6. CLI, macOS install dry-run, README

- **Goal:** Loadable packaging + owner docs.
- **Requirements:** R13, R14, R16
- **Files:** `cursor-rootv2/src/cli.ts`, `cursor-rootv2/src/install/macos.ts`, `cursor-rootv2/bin/cursor-rootv2.js`, `cursor-rootv2/scripts/install-macos.sh`, `cursor-rootv2/scripts/uninstall-macos.sh`, `cursor-rootv2/tests/install-paths.test.ts`, `cursor-rootv2/README.md`
- **Approach:** CLI subcommands; plist generator targets `~/Library/LaunchAgents`; dry-run never writes; README states non-goals.
- **Test scenarios:**
  - Plist path under LaunchAgents.
  - Uninstall plan lists plist + data dir.
  - `install` on non-darwin returns unsupported unless `--dry-run`.
- **Verification:** install-paths.test.ts + README present.

### U7. Thought-pattern chain compile

- **Goal:** Each thought kind is one chained index file; compile to sequenced frames and a generated stepper runtime under `.rootv2/`.
- **Requirements:** R1, R2, R3, R9, R16
- **Files:** `cursor-rootv2/src/thoughts/**/index.ts`, `cursor-rootv2/src/thoughts/chain.ts`, `cursor-rootv2/src/compile/index.ts`, `cursor-rootv2/src/runtime/interpreter.js`, `cursor-rootv2/tests/thought-compile.test.ts`
- **Approach:** Ordered chain 00–08; compile hashes payloads; write `sequence/NNN-id.frame.json`, `tape.json`, `runtime.mjs`. Interpreter is a tape VM, not a copy of thought sources.
- **Test scenarios:**
  - Chain links seq/next without gaps.
  - Compile writes nine sequenced frames under `.rootv2/sequence`.
  - Tape phishing intent halts at constitution.
  - Generated `runtime.mjs` runs independently via `node`.
- **Verification:** thought-compile.test.ts.

## Verification Contract

- `cd cursor-rootv2 && npm install && npm test && npm run typecheck`
- Manual on Mac (owner): dry-run then real install when ready; not required for CI green.

## Definition of Done

- U1–U7 implemented with passing tests.
- README covers constitution, allowlist, detectors, identity ACL, uninstall, thought compile, non-goals.
- No LaunchDaemon/root paths.
- CertForge unchanged.
- Plan deepened date set; scope cuts recorded in R5/R16/KTD3/KTD8.
