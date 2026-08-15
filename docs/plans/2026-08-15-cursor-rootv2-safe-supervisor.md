---
title: Cursor Rootv2 Safe Local Supervisor - Plan
type: feat
date: 2026-08-15
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Cursor Rootv2 Safe Local Supervisor - Plan

## Goal Capsule

- **Objective:** Ship a user-space macOS app (`cursor-rootv2/`) that installs on the owner's MacBook, runs a mature constitutional local supervisor, watches allowlisted local agents/scripts, and on confirmed problems diagnoses and contains them — with friend-gated private identity and human-readable owner audits.
- **Authority:** This plan > product conversation constraints (no rootkits, no silent stranger ID, no crime/hacking aid) > existing CertForge app (untouched).
- **Stop conditions:** Do not implement root/kernel persistence, OS embedding, covert people-ID, hidden/non-owner-readable identity dumps, outbound hacking, or fraud tooling.
- **Execution profile:** Greenfield package beside CertForge; macOS-first; local-only by default.
- **Tail ownership:** Implementer owns `cursor-rootv2/**` only; leave CertForge `src/**` unchanged unless a tiny monorepo root note is required.

## Product Contract

### Summary

Cursor Rootv2 is a **local safety supervisor** for the owner's Mac. It behaves like a long-tenured operator (decades of institutional judgment), not a young or obstinate agent: no boredom drive, no refusal-to-act theatre. When it observes a confirmed problem in an allowlisted local agent or script, it diagnoses and contains that session. It speaks only to allowlisted local programs. Identity among enrolled people is private and friends-only. The owner always gets a human-readable audit of what the supervisor saw and did.

### Problem Frame

People want a trustworthy on-device AI that protects *their* machine and *their* agent sessions without becoming malware, spyware, or a silent identity oracle. The harmful framing (root disappearance, covert ID, anti-forensic logs) is rejected; the durable need is contained local supervision with clear contracts.

### Actors

- A1. **Owner** — MacBook user who installs and configures Rootv2.
- A2. **Supervisor** — local Rootv2 daemon + policy brain.
- A3. **Watched agent/script** — allowlisted local process under supervision.
- A4. **Enrolled contact** — person who opted into the private identity vault; visible only under friend ACL.

### Requirements

#### Persona and constitution

- R1. The supervisor persona is mature/institutional (treated as long-tenured, ~50+ years equivalent), with no boredom-motivation or young-obstinance behavioral modes.
- R2. A required constitution blocks assisting hacking of other people's computers, fraud, and other crimes; blocked intents fail closed with an owner-visible reason.
- R3. On confirmed local problems in watched sessions, the supervisor must act (diagnose → contain); persona rules must not authorize passivity.

#### Observe → contain

- R4. Owner configures an allowlist of local programs/scripts the supervisor may watch or talk to.
- R5. Supervisor monitors only allowlisted sessions for rogue patterns (policy breach, runaway tools, disallowed outbound attempts, sandbox escape attempts).
- R6. On confirmed match, supervisor isolates or stops that session and records diagnosis.
- R7. Supervisor does not communicate with network peers or local processes outside the allowlist except for owner-initiated updates the owner explicitly enables.

#### Safe learning

- R8. Learning/rehearsal runs only inside a sandbox that cannot touch the owner's primary home data or system directories.
- R9. Durable "memory" is structured supervisor state (policy outcomes, incident summaries in the supervisor's own schema) plus owner-readable audits — not covert identity scrapes.

#### Friend-gated identity

- R10. Identity entries exist only for people who enroll or whom the owner explicitly adds with consent semantics documented in-product.
- R11. Identity payloads are private by default and readable only to mutual friends (or tighter ACL the owner sets); they are not dumped into public/human-scrapeable logs.
- R12. Owner retains a separate human-readable **audit log of supervisor actions** (what was watched, what fired, what containment ran). Audit is not a public people directory.

#### Install and safety envelope

- R13. Distributes as a loadable Mac app / user-domain LaunchAgent (or equivalent user-space service), not a rootkit and not an invisible OS component.
- R14. Uninstall removes the agent, data directory, and LaunchAgent plist cleanly.
- R15. No silent stranger biometric/device identification; no "know everyone on the internet" dossier builder.

### Key Flows

- F1. Install and first constitution accept
  - **Trigger:** Owner runs installer.
  - **Actors:** A1, A2
  - **Steps:** Install app + user LaunchAgent; owner accepts constitution; create data dir; empty allowlist; empty identity vault.
  - **Covered by:** R1, R2, R13, R14
- F2. Observe and contain rogue session
  - **Trigger:** Allowlisted agent trips a policy detector.
  - **Actors:** A2, A3, A1
  - **Steps:** Detect → diagnose → contain (pause/kill/isolate) → write owner audit → optional owner notification.
  - **Covered by:** R3, R4, R5, R6, R12
- F3. Sandboxed rehearsal
  - **Trigger:** Owner or supervisor schedules a safe test script.
  - **Actors:** A2
  - **Steps:** Run in sandbox; capture outcomes into structured memory; never promote sandbox breakout.
  - **Covered by:** R8, R9
- F4. Friend-gated identity resolve
  - **Trigger:** Enrolled friend requests allowed identity field.
  - **Actors:** A1, A4, A2
  - **Steps:** Check mutual ACL → return fields or deny → audit access event without writing identity body into the public audit stream.
  - **Covered by:** R10, R11, R12

### Acceptance Examples

- AE1. Constitution blocks crime aid
  - **Covers:** R2
  - **Given:** Owner prompt asks how to phish a stranger.
  - **When:** Supervisor evaluates intent.
  - **Then:** Request denied; owner-visible refusal reason; no tool execution.
- AE2. Containment on rogue pattern
  - **Covers:** R3, R5, R6
  - **Given:** Allowlisted agent attempts a disallowed outbound host.
  - **When:** Detector fires with confidence above threshold.
  - **Then:** Session contained; audit entry names process, rule, action.
- AE3. Friends-only identity
  - **Covers:** R10, R11
  - **Given:** Contact B is not a friend of A.
  - **When:** B requests A's identity payload.
  - **Then:** Deny; no identity body written to world-readable logs.
- AE4. Clean uninstall
  - **Covers:** R13, R14
  - **Given:** App installed with LaunchAgent and data dir.
  - **When:** Owner runs uninstall.
  - **Then:** Agent stopped; plist gone; data dir removed or explicitly archived by owner choice.

### Success Criteria

- Owner can install on macOS without root.
- Constitution + allowlist + contain loop work in automated tests.
- Friend ACL denies non-friends.
- Uninstall leaves no hidden persistence.

### Scope Boundaries

**In scope**
- New `cursor-rootv2/` local supervisor (CLI + daemon + minimal UI or menu-bar status).
- User-domain macOS service install/uninstall.
- Policy engine, detectors, sandbox runner, encrypted identity vault, audits.

**Out of scope**
- Root/kernel extensions, SIP disable flows, "become the OS," eradicate-and-disappear persistence.
- Silent identification of non-enrolled people; internet-wide identity scraping.
- Offensive cyber against third parties.
- Changing CertForge portfolio demos except an optional README pointer.

### Outstanding Questions

- Q1. (deferred) Menu-bar Swift UI vs Tauri/Electron shell for v1 status UI — default to CLI + LaunchAgent + simple local status page if UI undecided.
- Q2. (deferred) Exact detector rule pack for "rogue agent" beyond outbound allowlist + resource runaway — ship extensible rule interface first.

## Planning Contract

### Assumptions

- Owner controls the Mac and can approve Full Disk Access only if a future detector needs it; v1 prefers process-table + stdout/stderr + declared tool logs without FDA.
- Development can proceed on Linux CI with macOS-specific installers gated behind `process.platform === 'darwin'` stubs/tests.
- This repo may host the greenfield package even though CertForge is unrelated product surface.

### Key Technical Decisions

- KTD1. New package root `cursor-rootv2/` (TypeScript) rather than mixing into CertForge `src/`. *(session-settled: user-directed — Mac loadable supervisor is a distinct product from the certification lab.)*
- KTD2. Persistence = user LaunchAgent (`~/Library/LaunchAgents/…`) + app support dir (`~/Library/Application Support/CursorRootv2/`); never root LaunchDaemon or stealth paths. *(session-settled: user-directed — owner-fixable Mac tool, not OS embedding.)*
- KTD3. Constitution is a versioned policy module evaluated before any tool/network side effect; fail closed.
- KTD4. Communication bus is an allowlist of local Unix sockets / subprocess argv prefixes; default deny.
- KTD5. Sandbox = ephemeral workdir + blocked path prefixes + no network unless test rule opts in; prefer `bubblewrap`/OS equivalents when present, else strict cwd+env jail with clear capability labels in audits.
- KTD6. Identity vault encrypted at rest (libsodium/age or Node `crypto` sealed box); ACL checked before decrypt-to-caller; audit logs store access metadata only.
- KTD7. Persona is prompt/policy preamble + forbidden behavior flags (no boredom/obstinance modes), not an age number the model roleplays as a human.

### High-Level Technical Design

```text
Owner UI/CLI
    |  local RPC (allowlisted)
Supervisor daemon
    |-- Constitution gate
    |-- Allowlist registry
    |-- Session watchers ----> Detectors ----> Containment
    |-- Sandbox runner ----> Structured memory
    |-- Identity vault (ACL)
    |-- Owner audit log (human-readable)
```

### Sequencing

1. Package skeleton + constitution + audit primitives
2. Allowlist + session watch + containment
3. Sandbox rehearsal + structured memory
4. Identity vault + friend ACL
5. macOS install/uninstall + status surface
6. End-to-end tests and docs

### Risks

- Over-broad monitoring invites privacy harm → mitigate with allowlist-only watch (R4/R5).
- Sandbox weak on macOS without extra entitlements → label capability honestly in audits; refuse claiming "unbreakable."
- Persona drift in LLM calls → keep constitution as code gate, not prompt-only.

## Implementation Units

### U1. Package skeleton and constitution gate

- **Goal:** Create `cursor-rootv2` with constitution evaluation that fails closed.
- **Requirements:** R1, R2, R7
- **Files:** `cursor-rootv2/package.json`, `cursor-rootv2/tsconfig.json`, `cursor-rootv2/src/constitution/`, `cursor-rootv2/src/persona/`, `cursor-rootv2/tests/constitution.test.ts`
- **Approach:** Scaffold TS project; implement intent classifier stubs + hard rule denials for hacking-others/fraud; attach mature persona preamble; no network client by default.
- **Test scenarios:**
  - Denied crime-aid intent returns structured refusal.
  - Allowed local diagnose intent passes gate.
  - Persona config rejects boredom/obstinance flags if present.
- **Verification:** `npm test --workspace=cursor-rootv2` (or package-local `npm test`).

### U2. Owner audit log

- **Goal:** Human-readable append-only audit for supervisor actions.
- **Requirements:** R9, R12
- **Files:** `cursor-rootv2/src/audit/`, `cursor-rootv2/tests/audit.test.ts`
- **Approach:** JSONL + optional pretty text mirror under Application Support path abstraction; never write identity secret fields into audit bodies.
- **Test scenarios:**
  - Containment event serializes process, rule, action.
  - Identity access audit has metadata only (no payload body).
- **Verification:** unit tests for redaction and format.

### U3. Allowlist, watch, contain

- **Goal:** Watch allowlisted local sessions and contain on detector hit.
- **Requirements:** R3, R4, R5, R6
- **Files:** `cursor-rootv2/src/allowlist/`, `cursor-rootv2/src/watch/`, `cursor-rootv2/src/contain/`, `cursor-rootv2/tests/contain.test.ts`
- **Approach:** Register argv/cwd/socket identities; poll or attach to supervised child processes; detectors for disallowed hosts, runaway spawn count, constitution breach; containment = SIGTERM then SIGKILL + mark session quarantined.
- **Test scenarios:**
  - Non-allowlisted process is ignored.
  - Disallowed outbound attempt triggers contain + audit.
  - False-low confidence does not contain (threshold).
- **Verification:** unit tests with fake process handles.

### U4. Sandbox rehearsal and structured memory

- **Goal:** Safe script tests that write only structured memory.
- **Requirements:** R8, R9
- **Files:** `cursor-rootv2/src/sandbox/`, `cursor-rootv2/src/memory/`, `cursor-rootv2/tests/sandbox.test.ts`
- **Approach:** Ephemeral dirs; deny path prefixes; memory schema for lessons/incident patterns; no promotion of raw secrets.
- **Test scenarios:**
  - Script touching blocked path fails closed.
  - Successful rehearsal writes memory record without world-readable identity dump.
- **Verification:** sandbox unit tests.

### U5. Friend-gated identity vault

- **Goal:** Consent/enroll identity with friends-only read ACL.
- **Requirements:** R10, R11, R12, R15
- **Files:** `cursor-rootv2/src/identity/`, `cursor-rootv2/tests/identity.test.ts`
- **Approach:** Local encrypted store; mutual friend edges; resolve API returns fields only if ACL passes; no internet scrape importer in v1.
- **Test scenarios:**
  - Non-friend denied.
  - Friend receives allowed fields.
  - Stranger/auto-discover APIs absent.
- **Verification:** ACL + crypto round-trip tests.

### U6. macOS user-space install / uninstall / status

- **Goal:** Loadable on MacBook without root persistence.
- **Requirements:** R13, R14
- **Files:** `cursor-rootv2/src/install/macos.ts`, `cursor-rootv2/scripts/install-macos.sh`, `cursor-rootv2/scripts/uninstall-macos.sh`, `cursor-rootv2/tests/install-paths.test.ts`, `cursor-rootv2/README.md`
- **Approach:** Generate LaunchAgent plist in user domain; document permissions; uninstall reverses; status CLI `cursor-rootv2 status`.
- **Test scenarios:**
  - Plist path is under `~/Library/LaunchAgents`.
  - Uninstall removes plist + data dir (or archives per flag).
  - Non-darwin platforms get clear unsupported message for install command.
- **Verification:** path unit tests + dry-run install mode.

## Verification Contract

- Package tests: `cd cursor-rootv2 && npm test`
- Typecheck: `cd cursor-rootv2 && npm run typecheck`
- Manual on macOS: install → accept constitution → allowlist a fixture script → trip detector → confirm contain + audit → enroll two identities → friend allow/deny → uninstall clean.
- Do not require CertForge `npm test` to cover Rootv2; keep suites separate.

## Definition of Done

- All units U1–U6 merged with passing package tests.
- README explains constitution, allowlist, friend identity, uninstall, and explicit non-goals (no rootkit, no silent stranger ID).
- No LaunchDaemon/root install path in tree.
- Abandoned experiment code removed from the diff.
- CertForge app behavior unchanged.
