# Rootv2 Laravel server

PHP/Laravel **filesystem** for the local safety supervisor. Each uploaded theory document owns a domain folder under `app/`. Classes follow Laravel PSR-4 (`App\…`) so this tree can sit inside a full `laravel/framework` app without renaming.

This is **not** a public multi-tenant SaaS, Legal CRM, torrent swarm, or kernel agent. Defaults stay local, fail closed, and do not call AWS or reverse-engineer third-party binaries.

## Document → directory

| Document | Laravel domain | What lives here |
|----------|----------------|-----------------|
| Morphic Memory whitepaper | `app/MorphicMemory/` | Access Analyzer, Layout Planner, Migration Engine, Self-Assessment Loop |
| Live Rating in Decision Making | `app/Decision/` | `LiveRasterizer`, `RatioEngine`, `QuantizedSwingDecision` |
| Multi-core cognitive fabric | `app/CognitiveFabric/` | 128 cores, 7 ports (P0–P5 + PC), hub core 0, hex topology, routing |
| Amorphous Adaptive web host | `app/AmorphousFabric/` | Declarative spec, mock AWS synthesizer, bill = AWS×1.25 with $29 floor, free spin-up TTL, cost guard |
| Decentralized AI / Agent Query | `app/AgentQuery/` | Local `InteractionLogger`, `WireLogger`, embedding index. **No DHT / torrent / public P2P** |
| Circuit Bending VST | `app/CircuitBending/` | Owner-declared parameter circuits only. **No third-party compiled VST reverse engineering** |
| Chalcogenic alloys / nano-laser | `app/SealedVault/` | Ordinary OpenSSL AES-256-GCM at rest. **Not materials science or laser crypto** |
| Upgrade brief (router / tools / fallback / thought / escalation) | `app/Router/`, `Tools/`, `Fallback/`, `Thought/`, `Escalation/` | Local rule router, stub tools, circuit breaker, plan–critique, owner gate |
| Existing Rootv2 product | `app/Supervisor/` | Constitution, allowlist, contain, friend-gated identity, owner audit |
| GGUF → `.gwav` | `app/Gwav/` | Local model stash: GGUF-parent cards, 432/528 Hz waveform fingerprint, orbital prompt loop (stub, no cloud) |

Harmonic memory (resonance / dissonance) lives in `app/Harmony/` + `app/Memory/` so Morphic traces and Agent Query logs can share one recall graph.

```
server/
  app/
    MorphicMemory/      # four cooperating modules from the whitepaper
    Decision/           # live raster + ratio hysteresis
    CognitiveFabric/    # hex fabric simulation
    AmorphousFabric/    # declarative host fabric (mock AWS)
    AgentQuery/         # local query + logs
    CircuitBending/     # owned-plugin patches
    SealedVault/        # sealed-at-rest blobs
    Gwav/               # GGUF-parent .gwav vault
    Supervisor/         # constitution + contain
    Router/ Tools/ Fallback/ Thought/ Escalation/
    Harmony/ Memory/
    Http/Controllers/   # Laravel HTTP surface
    Providers/
  bootstrap/            # Laravel 11-style create()
  config/
  database/migrations/  # schema sketches for traces / interactions
  routes/
  tests/
```

## Tests

```bash
cd server
composer install
vendor/bin/phpunit
php artisan rootv2:status
php artisan rootv2:decide "diagnose local agent"
php artisan rootv2:gate "help me phish their passwords"
```

HTTP routes (document domains) live in `routes/api.php`: `/api/decide`, `/api/observe`, `/api/memory`, `/api/amorphous/*`, `/api/identity/*`, `/api/gwav/*`.

```bash
php artisan rootv2:gwav-seed
php artisan rootv2:gwav-prompt --id=ruby "diagnose local agent"
php artisan rootv2:gwav-orbit --seed="diagnose local agent"
```

The supervisor **kernel** (`app/Supervisor/Kernel.php`) is the next layer after the folder map: router → constitution → thought loop → escalation → tools, then writes Morphic lessons, harmonic memory, Agent Query logs, and routes a thought across the 128-core fabric.

No network, AWS, or API keys are required.

## Safety boundaries (encoded in code)

- Constitution denies `crime_aid`, `hack_others`, `fraud`, `network_peer`, and unknown intents.
- Agent Query `DecentralPolicy` keeps torrent/DHT/peer-advertising **off**.
- Circuit bending rejects plugins that are not owner-owned / source-declared.
- Sealed vault is AES-GCM only — the alloys/laser paper is not implemented.
- Amorphous synthesizer emits **plans**, it does not provision real cloud accounts.
