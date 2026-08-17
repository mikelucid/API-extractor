# Mathematical Thinking AI — Live Rasterizing + Explicit Math Models

From-scratch implementation of the Live Rating PDF section
**“Mathematical Thinking AI: Live Rasterizing + Explicit Math Models”**.

## Why this exists

Black-box NN ratios (also in this package) predict; this module **thinks with equations**:

| Step | Equation |
|------|----------|
| Dynamics | \(m_{t+1} = m_t + a\cdot\Delta t\) |
| Uncertainty | \(\Sigma_{t+1} = \Sigma_t + q\cdot\Delta t\cdot I\) |
| Likelihood | \(P(x)=\frac{1}{2\pi\sqrt{\|\Sigma\|}}\exp(-\frac12(x-\mu)^\top\Sigma^{-1}(x-\mu))\) |
| Decision ratio | \(R = P_{\mathrm{threat}}(m)/(P_{\mathrm{safe}}(m)+\varepsilon)\) |
| Choice | \(\arg\max_a \mathbb{E}[R]\) over horizon (with uncertainty penalty) |

Every candidate action gets a printed/structured reasoning trace.

## Code

| Path | Role |
|------|------|
| `src/decision/math-thinking.ts` | TypeScript MathRasterizer, WorldModel, RatioPredictor, thinkAndChoose, SymmetricTimeWeight |
| `src/thought/index.ts` | **Self-coding** ThoughtLoop seeds plans from MathematicalThinkingAI |
| `python/math_thinking_ai.py` | Python reference / lab (`python3 python/math_thinking_ai.py`) |

## Suitable extensions added

- Uncertainty penalty on \(\mathbb{E}[R]\) when covariance grows
- Safety-aware action pick (high \(R_{\mathrm{now}}\) → contain/escalate)
- Telemetry ingest mapping for supervisor signals
- Structured `mathTrace` on thought plans for audits

## Self-coding integration

`ThoughtLoop.run()` always runs `MathematicalThinkingAI.decide()` and builds the plan via `planFromMath()` so containment / escalate / hold choices carry explicit math reasoning—not only heuristic thresholds.
