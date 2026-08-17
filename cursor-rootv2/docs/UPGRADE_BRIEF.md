# cursor-rootv2 Upgrade Brief

Extracted from DeepSeek conversation dumps under `/tmp/pdf-extract/`. Target: upgrade the **local safety supervisor** decision loop (not Legal SaaS CRM). Defaults stay offline / stubbed; no cloud OpenAI keys required; no rootkits; no crime aid; Stable Diffusion is optional and allowlisted.

**Current spine (keep):**
`SupervisorAgent.gate` → `evaluateConstitution` → `SessionWatcher.observe` → `detectThreats` → `ContainmentService` + `MemoryDataset` / `AgentDatasetStore` / audit.

---

## A) Top 8 features/modules to add

| # | Feature | Why it fits a local safety supervisor |
|---|---------|----------------------------------------|
| 1 | **Local intent / tool router** | Deterministic route of owner requests → tools without LLM classifier cost; confidence + safe fallback |
| 2 | **Tool catalog + stub adapters** | Extensible handlers (local text, status, sandbox, optional SD) with no cloud keys by default |
| 3 | **Provider fallback + circuit breaker** | Fail to local validation when optional remotes die; never hang containment |
| 4 | **Live decision-ratio engine** | Turn detector hits / host / spawn signals into a live P_threat/P_safe ratio for contain vs hold |
| 5 | **Quantized swing + hysteresis** | Stop contain/release flutter near thresholds |
| 6 | **Thought–plan–critique loop** | Plan containment/diagnose steps, rehearse in sandbox, critique, refine before irreversible kill |
| 7 | **Escalation / auto-response gate** | Owner-tunable ratio: auto-contain vs escalate-to-owner |
| 8 | **Optional SD image tool (allowlisted)** | Behind constitution + tool allowlist; stub by default; never required for core safety |

---

## B) Feature → source PDF → names → TS module path

### 1. Local intent / tool router
- **PDF:** `AI_API_Router_System_Design_-_DeepSeek_c788.txt`
- **Names:** `RuleBasedAIRouter`, `ComplexRouter`, `normalize`, `keyword_match`, `aggregate_confidences`, `decide_api` (confidence &lt; 0.4 → safe fallback), `route_and_execute`
- **Create:** `src/router/local-router.ts`, `src/router/types.ts`, `src/router/index.ts`
- **Adapt:** APIs become supervisor **tools** (`local_diagnose`, `contain_session`, `sandbox_rehearsal`, `owner_status`, optional `image_gen`), not OpenAI text/image/stt/tts. Prefer rule/keyword aggregation over MiniLM for v1; keep `IntentExample` shape for future local embeddings.

### 2. Tool catalog + stub adapters
- **PDF:** same Router extract (`UniversalAIRouter`, `catalog`, handler dispatch)
- **Names:** `catalog`, `route`, handler map pattern from `AIRouter` / `UniversalAIRouter`
- **Create:** `src/tools/catalog.ts`, `src/tools/adapters/stub-text.ts`, `src/tools/adapters/local-status.ts`, `src/tools/adapters/sandbox-rehearse.ts`, `src/tools/types.ts`, `src/tools/index.ts`
- **Contract:** every adapter returns `{ ok, toolId, payload, usedStub: boolean }`; adapters that need network are disabled unless `outsideAllowlist` is false **and** constitution allows.

### 3. Provider fallback + circuit breaker
- **PDF:** `Legal.ai-_Shared_Conversation_-_DeepSeek_19ef.txt`
- **Names:** `LegalProviderManager`, `CircuitBreaker`, `fallbackProviders`, `getLocalFallback`, `validate`
- **Create:** `src/fallback/circuit-breaker.ts`, `src/fallback/provider-chain.ts`, `src/fallback/local-patterns.ts`, `src/fallback/index.ts`
- **Adapt:** chain order default `local_stub → optional_remote`; on open circuit always `getLocalFallback`-style regex/heuristic result with `confidence: 0.5` and `provider_used: "local"`.

### 4. Live decision-ratio engine
- **PDF:** `Live_Rating_in_Decision_Making_-_DeepSeek_5f8e.txt`
- **Names:** `LiveRasterizer`, `decision_from_ratio`, `RATIO_THRESHOLD`, classifier → `prob_ratio = P1/(P0+ε)`
- **Create:** `src/decision/live-raster.ts`, `src/decision/ratio.ts`, `src/decision/types.ts`, `src/decision/index.ts`
- **Adapt:** “raster grid” = fixed feature bins over live telemetry (host-hit density, spawn rate, constitution-breach flags, sandbox-escape flags) from `ProcessSnapshot` / `DetectorHit[]` — **not** GIS imagery. Output `DecisionRatio { threatSafeRatio, action: "contain"|"hold"|"escalate" }`.

### 5. Quantized swing + hysteresis
- **PDF:** Live Rating extract
- **Names:** `QuantizedSwingDecision`, `quantize_ratio`, `decision_from_quant`, hysteresis deadband
- **Create:** `src/decision/quantized-swing.ts`
- **Map:** levels → `EVASIVE_ACTION` = contain, `HOLD` = keep watching, strong-safe = release/clear soft quarantine only after hysteresis.

### 6. Thought–plan–critique loop
- **PDFs:** Coding agent (`Coding_AI_Agent_with_Stable_Diffusion_-_DeepSeek_a148.txt`) + Live Rating look-ahead
- **Names:** `AgentBrain.think_initial`, `refine_plan`, `_parse_json` fallback, `Critic.evaluate` / `is_satisfied`, `CreativeAgent.execute` (Think→Act→Critique→Refine), `choose_best_action`, `predict_future_ratio`, `LightweightCritic`
- **Create:** `src/thought/plan.ts`, `src/thought/critic.ts`, `src/thought/loop.ts`, `src/thought/lookahead.ts`, `src/thought/index.ts`
- **Adapt:** “Act” for safety = **sandbox rehearsal** or scored what-if over `{SIGTERM, quarantine, hold}`, not image gen. Brain may be pure TypeScript heuristics + optional stub LLM adapter (Ollama-shaped later). Use `LightweightCritic` pattern: rule/heuristic critic by default, no VLM required.

### 7. Escalation / auto-response gate
- **PDF:** Legal.ai extract
- **Names:** `AiLegalService.requiresHumanIntervention`, `auto_response_ratio`, `escalation_threshold`, `analyzeMessage` urgency
- **Create:** `src/escalation/gate.ts`, `src/escalation/types.ts`, `src/escalation/index.ts`
- **Adapt:** urgency from max detector confidence × ratio engine; if above threshold → audit + owner notify stub, skip auto-kill. `auto_response_ratio` (0–100) = % of containable hits handled automatically when below escalation threshold.

### 8. Optional Stable Diffusion tool (allowlisted)
- **PDF:** Coding agent extract
- **Names:** `ImageGenerator`, `CreativeAgent`, `AgentBrainOllama` (local-only path)
- **Create:** `src/tools/adapters/stable-diffusion.ts` (optional), `src/tools/allowlist.ts`
- **Rules:** disabled unless tool id in owner allowlist **and** constitution intent is not deny-class **and** adapter may be a no-op stub that returns `{ usedStub: true }`. Never imported by default decision path.

---

## C) Deleted / abandoned designs — resurrect intentionally

| Source | What happened | Verdict for rootv2 |
|--------|---------------|--------------------|
| Router PDF ~p88 | User told model weighting was “just redundant”; schema stripped of `rating`; simplified entry without rating | **Resurrect rating** on memory lessons / decision logs. Supervisor needs ranked retrieval of past incidents (`rating × recency`). Keep append-only audit; add optional `rating` on `MemoryLessonRecord`. |
| Router PDF ~p166 | Explicitly **Removed**: Torrent/P2P transfer, peer recognition, advertising | **Do not resurrect** P2P/torrent/peers (conflicts with `outsideAllowlist` / `network_peer` deny). Keep local JSON logs only (`InteractionLogger` / `WireLogger` shapes → map to `AuditLog` + memory). |
| Router PDF | LLM `AIRouter._classify_intent` (GPT-3.5) abandoned for `RuleBasedAIRouter` / `ComplexRouter` | Keep **rule-first**; optional local embedding later; never require OpenAI for routing. |
| Coding agent | Cloud OpenAI brain → local Phi-3 / `AgentBrainOllama`; heavy `Critic` VLM → `LightweightCritic` | Resurrect **local/stub brain + lightweight critic** as defaults. |
| Live Rating ~p288 | “Missing part… Writer’s IFS not differentiable → Replaced with MLP”; mock torrent | Resurrect **propose → evaluate_improvement → accept/reject** as rule-delta learning into `MemoryDataset`, **without** torrent meme sharing. |
| Legal.ai | Remote Casetext fail → `getLocalFallback` regex | Resurrect local pattern fallback for any optional validator. |

**Short snippets worth porting (shape only):**

```text
# ComplexRouter safe fallback
if confidence < 0.4 and best_api != "text":
    best_api = "text"
    confidence = 0.8  # text is always safe
```
→ For rootv2: low confidence → `owner_status` / `hold`, never speculative `contain_session`.

```text
# QuantizedSwingDecision hysteresis
if self.last_quant == 0:
    quant = 0 if ratio <= 1.0 + self.hyst else 1
```
→ Avoid contain/release flutter.

```text
# LegalProviderManager
return $this->getLocalFallback($content);
# confidence 50, provider_used local
```
→ Circuit open → local heuristics.

```text
# AgentBrain._parse_json fallback
plan = { reasoning: "Fallback due to parsing error.", positive_prompt: fallback_prompt, ... }
```
→ Malformed thought JSON → fail closed to `HOLD` plan, audit the parse failure.

---

## D) Integration with existing SupervisorAgent / constitution / detectors / datasets

```text
Owner request / ProcessSnapshot
        │
        ▼
┌───────────────────┐
│ 1. LocalRouter    │  keyword+session confidence → tool candidate
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 2. Constitution   │  evaluateConstitution (existing) — fail closed on
│    gate           │  crime_aid / hack_others / fraud / network_peer / unknown
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 3. EscalationGate │  auto_response_ratio + escalation_threshold
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 4. ThoughtLoop    │  think_initial → lookahead ratios → sandbox rehearse
│                   │  → LightweightCritic → refine_plan (max N)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 5. ToolCatalog    │  stub adapters; optional SD only if allowlisted
│  + FallbackChain  │  circuit breaker → local patterns
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 6. Live observe   │  SessionWatcher + detectThreats (existing)
│  + RatioEngine    │  DetectorHit[] → threatSafeRatio → QuantizedSwing
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 7. Containment    │  existing ContainmentService when quant == contain
│  + Memory/Audit   │  recordLesson with optional rating; audit all steps
└───────────────────┘
```

**Concrete wiring:**

1. Extend `SupervisorAgent` with `decide(request)` that runs router → `gate()` → escalation → thought loop → tool execute; keep `observe()` for live path.
2. Feed `detectThreats` hits into `LiveRasterizer.addSignal(kind, intensity)` each `observe`.
3. Before `ContainmentService.contain`, require `QuantizedSwingDecision` action === contain **and** constitution still allows `contain_session`.
4. Thought lookahead uses `SandboxRunner` for “what if we kill / quarantine” rehearsals; write lessons via existing `recordLesson`.
5. Datasets: extend `MemoryLessonRecord` with optional `rating?: number` and `decisionRatio?: number`; extend `PolicyRuleRecord.kind` later with `"ratio_threshold"` if needed (v1 can keep ratio engine in-memory config).
6. Persona preamble stays; thought plans must not override constitution deny.
7. **Out of scope:** Laravel tenants, Clio, PACER, lead CRM, monetization, torrent DHT, advertising.

---

## E) Minimal test list

| Test file | Cases |
|-----------|--------|
| `tests/router.test.ts` | Keyword routes `contain…session` → `contain_session`; unknown low confidence → safe `hold`/`owner_status`; session boost does not override constitution deny |
| `tests/tools-catalog.test.ts` | Stub adapters return `usedStub: true`; SD adapter rejected when not allowlisted; allowlisted SD stub still constitution-gated |
| `tests/fallback.test.ts` | Circuit opens after N failures; `getLocalFallback` shape returned; successful call closes circuit |
| `tests/decision-ratio.test.ts` | Synthetic hit stream → ratio crosses threshold → `contain`; below → `hold` |
| `tests/quantized-swing.test.ts` | Hysteresis: ratio oscillates around 1.0 without flutter; levels map to contain/hold/escalate |
| `tests/thought-loop.test.ts` | `think_initial` JSON parse failure → HOLD; refine after critic dissatisfaction; max_refinements bound; lookahead picks safer action |
| `tests/escalation.test.ts` | High urgency ≥ threshold → no auto-kill; `auto_response_ratio=0` always escalates; ratio=100 auto-contains when allowed |
| `tests/supervisor-decide.test.ts` | End-to-end: diagnose allowed; crime_aid denied before tools; observe+ratio triggers containment with audit trail |

Existing tests (`constitution`, `agents`, `sandbox`, `datasets`, `audit`) remain green; new modules must not require network or API keys in CI.

---

## Implementation order (suggested)

1. `decision/` + `quantized-swing` hooked into `SessionWatcher` post-`detectThreats`
2. `router/` + `tools/catalog` stubs + `SupervisorAgent.decide`
3. `escalation/gate` between constitution and tools
4. `thought/loop` + sandbox lookahead
5. `fallback/` for optional adapters
6. Optional `stable-diffusion` adapter last, behind allowlist

**Non-goals:** rebuilding Legal SaaS, P2P sync, cloud OpenAI routing, rootkit/stealth agents, crime-aid tooling.
