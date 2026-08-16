# Neural Network + Live Rasterizing (Ratio-Based Decisions)

Port of the **Live Rating in Decision Making** DeepSeek section titled
“Neural Network + Live Rasterizing for Ratio-Based Decisions” into Rootv2.

## Pipeline (PDF → Rootv2)

```text
streaming telemetry / detector hits
        │
        ▼
 GridLiveRasterizer.addPoint(x,y)     # density grid (default 8×8)
        │
        ▼
 getFeatures() → flatten               # fixed-size vector
        │
        ▼
 NeuralRatioPredictor (MLP 64→32→1)  # P(class=1) sigmoid
        │
        ▼
 probRatio = P1 / (P0 + ε)
        │
        ▼
 decision_from_ratio / QuantizedSwing  # contain | escalate | hold
        │
        ▼
 online liveTrainStep + false-prediction replay
```

## Mapping for the supervisor

GIS “lower-left vs upper-right” clusters become telemetry clusters:

| Signal | Approx. cluster |
|--------|-----------------|
| `safe_heartbeat` | (25,25) |
| `runaway_spawn` | (72,55) |
| `disallowed_host` | (78,78) |
| `constitution_breach` | (85,70) |
| `sandbox_escape` | (90,90) |

Mass-based `RatioEngine` remains as a soft blend when the NN is near 0.5.

## Implementation files

- `src/decision/grid-rasterizer.ts` — PDF `LiveRasterizer`
- `src/decision/neural-ratio.ts` — pure-TS MLP (no Torch/TF), bootstrap + online train
- `src/decision/live-raster.ts` — telemetry ingest → grid → NN → blended ratio
- `src/decision/quantized-swing.ts` — hysteresis (already present)

## Non-goals

- No Redis model store (PDF optional cache) in v1 — weights live in-process
- No TensorFlow/PyTorch dependency in CI
- No public P2P model gossip (see `docs/DECENTRALIZED_LLM_NOTES.md`)
