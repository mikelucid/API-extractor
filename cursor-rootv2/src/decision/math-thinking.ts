/**
 * Mathematical Thinking AI — Live Rasterizing + Explicit Math Models
 * From-scratch port of the Live Rating PDF section, adapted for Rootv2.
 *
 * Explicit equations (not black-box weights):
 *   new_mean = old_mean + action_delta * dt
 *   new_cov  = old_cov + process_noise * dt
 *   P(x)     = (1/(2π√|Σ|)) exp(-½ (x-μ)ᵀ Σ⁻¹ (x-μ))
 *   R        = P_threat(m) / (P_safe(m) + ε)
 */

export interface MathFeatures {
  meanX: number;
  meanY: number;
  covXX: number;
  covYY: number;
  covXY: number;
  n: number;
}

export interface MathAction {
  delta: readonly [number, number];
  id: "contain" | "escalate" | "hold" | "toward_safe" | "toward_threat";
  description: string;
}

export interface ReasoningStep {
  step: number;
  meanX: number;
  meanY: number;
  ratio: number;
  equation: string;
}

export interface ActionEvaluation {
  action: MathAction;
  expectedRatio: number;
  steps: ReasoningStep[];
  uncertaintyPenalty: number;
}

export interface MathDecision {
  best: ActionEvaluation;
  candidates: ActionEvaluation[];
  current: MathFeatures;
  currentRatio: number;
  /** Human-readable reasoning trace (PDF “prints each step”). */
  trace: string[];
}

export class MathRasterizer {
  private readonly xs: number[] = [];
  private readonly ys: number[] = [];
  private readonly bufferLen: number;

  constructor(bufferLen = 100) {
    this.bufferLen = bufferLen;
  }

  addPoint(x: number, y: number): void {
    this.xs.push(x);
    this.ys.push(y);
    if (this.xs.length > this.bufferLen) {
      this.xs.shift();
      this.ys.shift();
    }
  }

  clear(): void {
    this.xs.length = 0;
    this.ys.length = 0;
  }

  getMathFeatures(): MathFeatures {
    const n = this.xs.length;
    if (n === 0) {
      return { meanX: 50, meanY: 50, covXX: 0, covYY: 0, covXY: 0, n: 0 };
    }
    const meanX = mean(this.xs);
    const meanY = mean(this.ys);
    if (n === 1) {
      return { meanX, meanY, covXX: 0, covYY: 0, covXY: 0, n };
    }
    let covXX = 0;
    let covYY = 0;
    let covXY = 0;
    for (let i = 0; i < n; i++) {
      const dx = this.xs[i]! - meanX;
      const dy = this.ys[i]! - meanY;
      covXX += dx * dx;
      covYY += dy * dy;
      covXY += dx * dy;
    }
    const denom = n; // population-style (PDF used np.var default)
    return {
      meanX,
      meanY,
      covXX: covXX / denom,
      covYY: covYY / denom,
      covXY: covXY / denom,
      n,
    };
  }
}

export class MathWorldModel {
  constructor(private readonly processNoise = 1.0) {}

  /**
   * Linear dynamics with Gaussian process noise growth:
   * m_{t+1} = m_t + a·Δt
   * Σ_{t+1} = Σ_t + q·Δt·I  (cross-term unchanged)
   */
  predict(current: MathFeatures, actionDelta: readonly [number, number], dt = 1): MathFeatures {
    return {
      meanX: current.meanX + actionDelta[0] * dt,
      meanY: current.meanY + actionDelta[1] * dt,
      covXX: current.covXX + this.processNoise * dt,
      covYY: current.covYY + this.processNoise * dt,
      covXY: current.covXY,
      n: current.n,
    };
  }
}

export class MathRatioPredictor {
  /** Threat cluster (upper-right in PDF “good” was success; for safety we invert semantics). */
  private readonly threatMean: readonly [number, number] = [75, 75];
  private readonly safeMean: readonly [number, number] = [25, 25];
  private readonly invCov = 1 / 100; // Σ = 100·I ⇒ Σ⁻¹ = 0.01·I
  private readonly normFactor: number;

  constructor() {
    // 1 / (2π √|Σ|) with |Σ|=100*100 for 2D diagonal
    const det = 100 * 100;
    this.normFactor = 1 / (2 * Math.PI * Math.sqrt(det));
  }

  /** Isotropic Gaussian PDF with Σ = 100·I. */
  gaussianPdf(x: readonly [number, number], mean: readonly [number, number]): number {
    const dx = x[0] - mean[0];
    const dy = x[1] - mean[1];
    const exponent = -0.5 * (dx * dx + dy * dy) * this.invCov;
    return this.normFactor * Math.exp(exponent);
  }

  /**
   * Ratio = P_threat(centroid) / (P_safe(centroid) + ε)
   * High ratio ⇒ more threat-like cloud ⇒ prefer contain.
   */
  predictRatio(features: MathFeatures): { ratio: number; pThreat: number; pSafe: number } {
    const point: [number, number] = [features.meanX, features.meanY];
    const pThreat = this.gaussianPdf(point, this.threatMean);
    const pSafe = this.gaussianPdf(point, this.safeMean);
    return { ratio: pThreat / (pSafe + 1e-6), pThreat, pSafe };
  }
}

/** Symmetric triangular time window over past/future ratios (PDF SymmetricTimeWeight). */
export class SymmetricTimeWeight {
  private readonly half: number;
  private readonly delay: number;
  private readonly buffer: Array<{ ratio: number; t: number }> = [];
  private timeIndex = 0;

  constructor(windowHalfSize = 3, lookaheadDelay = 2) {
    this.half = windowHalfSize;
    this.delay = lookaheadDelay;
  }

  addRatio(ratio: number): void {
    this.buffer.push({ ratio, t: this.timeIndex });
    this.timeIndex += 1;
    const max = 2 * this.half + 1;
    while (this.buffer.length > max) this.buffer.shift();
  }

  getSymmetricWeightedRatio(currentTime: number): number {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const { ratio, t } of this.buffer) {
      const delta = t - currentTime;
      if (Math.abs(delta) > this.half) continue;
      const weight = 1 - Math.abs(delta) / (this.half + 1);
      totalWeight += weight;
      weightedSum += weight * ratio;
    }
    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
  }

  getCurrentDecisionWeight(): number {
    const currentT = this.timeIndex - 1;
    if (currentT < 0) return 0;
    const decisionT = Math.max(0, currentT - this.delay);
    return this.getSymmetricWeightedRatio(decisionT);
  }
}

export const SUPERVISOR_MATH_ACTIONS: MathAction[] = [
  {
    delta: [3, 3],
    id: "contain",
    description: "contain (drive cloud toward threat isolation / quarantine)",
  },
  {
    delta: [1, 1],
    id: "escalate",
    description: "escalate (partial shift — notify owner, keep watching)",
  },
  {
    delta: [0, 0],
    id: "hold",
    description: "hold (stay — continue observe)",
  },
  {
    delta: [-2, -2],
    id: "toward_safe",
    description: "rehearse toward safe region (sandbox soften)",
  },
];

/**
 * For each action, simulate horizon steps with explicit math and pick max expected ratio.
 * Adds uncertainty penalty: high cov shrinks expected score (suitable extension).
 */
export function thinkAndChoose(options: {
  current: MathFeatures;
  worldModel?: MathWorldModel;
  ratioPredictor?: MathRatioPredictor;
  actions?: MathAction[];
  horizon?: number;
  dt?: number;
}): MathDecision {
  const world = options.worldModel ?? new MathWorldModel(2);
  const ratios = options.ratioPredictor ?? new MathRatioPredictor();
  const actions = options.actions ?? SUPERVISOR_MATH_ACTIONS;
  const horizon = options.horizon ?? 2;
  const dt = options.dt ?? 1;
  const current = options.current;
  const currentRatio = ratios.predictRatio(current).ratio;

  const trace: string[] = [
    "=== AI Mathematical Thinking ===",
    `Current centroid: (${current.meanX.toFixed(2)}, ${current.meanY.toFixed(2)})`,
    `Current covariance: xx=${current.covXX.toFixed(2)}, yy=${current.covYY.toFixed(2)}, xy=${current.covXY.toFixed(2)}`,
    `Current ratio R=P_threat/P_safe = ${currentRatio.toFixed(3)}`,
  ];

  const candidates: ActionEvaluation[] = [];
  let best: ActionEvaluation | undefined;

  for (const action of actions) {
    trace.push(`\n  Considering action: ${action.description} (Δ=${action.delta[0]}, ${action.delta[1]})`);
    let sim = { ...current };
    const steps: ReasoningStep[] = [];
    const stepRatios: number[] = [];

    for (let step = 1; step <= horizon; step++) {
      sim = world.predict(sim, action.delta, dt);
      const { ratio } = ratios.predictRatio(sim);
      stepRatios.push(ratio);
      const equation =
        `m:=m+a·Δt → (${sim.meanX.toFixed(2)},${sim.meanY.toFixed(2)}); ` +
        `R:=P_t(m)/P_s(m)=${ratio.toFixed(3)}`;
      steps.push({
        step,
        meanX: sim.meanX,
        meanY: sim.meanY,
        ratio,
        equation,
      });
      trace.push(`    Step ${step}: ${equation}`);
    }

    const rawExpected = mean(stepRatios);
    // Suitable extension: penalize high predictive uncertainty
    const uncertaintyPenalty = Math.min(0.5, (sim.covXX + sim.covYY) / 400);
    const expectedRatio = rawExpected * (1 - uncertaintyPenalty);
    trace.push(
      `    E[R] over ${horizon} steps = ${rawExpected.toFixed(3)} ` +
        `(uncertainty penalty ${uncertaintyPenalty.toFixed(3)} → ${expectedRatio.toFixed(3)})`,
    );

    const evaluation: ActionEvaluation = {
      action,
      expectedRatio,
      steps,
      uncertaintyPenalty,
    };
    candidates.push(evaluation);
    if (!best || evaluation.expectedRatio > best.expectedRatio) {
      best = evaluation;
    }
  }

  // For safety supervisor: if current threat ratio is already high, prefer contain even if
  // "toward_safe" has higher R under inverted PDF semantics — map decision by action id intent.
  const safetyBest = pickSafetyAction(candidates, currentRatio) ?? best!;
  trace.push(
    `\nMathematical decision: '${safetyBest.action.description}' ` +
      `with expected ratio ${safetyBest.expectedRatio.toFixed(3)}`,
  );

  return {
    best: safetyBest,
    candidates,
    current,
    currentRatio,
    trace,
  };
}

/**
 * Safety-aware selection: high current threat → contain/escalate;
 * otherwise maximize simulated expected ratio among hold/escalate/contain.
 */
function pickSafetyAction(
  candidates: ActionEvaluation[],
  currentRatio: number,
): ActionEvaluation | undefined {
  const byId = (id: MathAction["id"]) => candidates.find((c) => c.action.id === id);
  if (currentRatio >= 2) return byId("contain") ?? byId("escalate");
  if (currentRatio >= 1) return byId("escalate") ?? byId("hold");
  // Low threat: prefer hold / toward_safe over aggressive contain
  const hold = byId("hold");
  const soft = byId("toward_safe");
  if (hold && soft) return hold.expectedRatio >= soft.expectedRatio ? hold : soft;
  return hold ?? soft;
}

export class MathematicalThinkingAI {
  readonly raster = new MathRasterizer();
  readonly world = new MathWorldModel(2);
  readonly ratios = new MathRatioPredictor();
  readonly timeWeight = new SymmetricTimeWeight(3, 2);

  observePoint(x: number, y: number): void {
    this.raster.addPoint(x, y);
  }

  decide(horizon = 2): MathDecision {
    const features = this.raster.getMathFeatures();
    const decision = thinkAndChoose({
      current: features,
      worldModel: this.world,
      ratioPredictor: this.ratios,
      horizon,
    });
    this.timeWeight.addRatio(decision.currentRatio);
    return decision;
  }

  /** Map detector-style intensity into spatial points (same clusters as NN raster). */
  ingestTelemetry(kind: "safe" | "threat" | "spawn" | "breach" | "escape", intensity = 0.8): void {
    const [cx, cy] =
      kind === "safe"
        ? [25, 25]
        : kind === "spawn"
          ? [72, 55]
          : kind === "breach"
            ? [85, 70]
            : kind === "escape"
              ? [90, 90]
              : [78, 78];
    const n = Math.max(1, Math.round(intensity * 6));
    for (let i = 0; i < n; i++) {
      this.observePoint(cx + (Math.random() - 0.5) * 10, cy + (Math.random() - 0.5) * 10);
    }
  }
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
