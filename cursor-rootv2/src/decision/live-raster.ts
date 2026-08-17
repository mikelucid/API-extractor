import type { DetectorHit } from "../agents/types.js";
import { GridLiveRasterizer } from "./grid-rasterizer.js";
import {
  bootstrapNeuralRatioPredictor,
  NeuralRatioPredictor,
  type RatioPrediction,
} from "./neural-ratio.js";
import { RatioEngine } from "./ratio.js";
import type { DecisionRatio, SignalKind } from "./types.js";

/**
 * Telemetry-facing raster: maps detector hits onto the PDF 2D density grid,
 * runs NeuralRatioPredictor (P1/P0), and keeps the mass-based RatioEngine
 * as a transparent fallback band.
 */
export class LiveRasterizer {
  readonly engine: RatioEngine;
  readonly grid: GridLiveRasterizer;
  readonly neural: NeuralRatioPredictor;
  private lastNeural: RatioPrediction | undefined;
  private bins: Record<SignalKind, number> = {
    disallowed_host: 0,
    runaway_spawn: 0,
    constitution_breach: 0,
    sandbox_escape: 0,
    safe_heartbeat: 0,
  };

  constructor(engine = new RatioEngine()) {
    this.engine = engine;
    const boot = bootstrapNeuralRatioPredictor(8, 36);
    this.grid = boot.raster;
    this.neural = boot.predictor;
  }

  tick(decay = 0.85): void {
    for (const key of Object.keys(this.bins) as SignalKind[]) {
      this.bins[key] *= decay;
    }
  }

  ingestHits(hits: DetectorHit[]): void {
    this.tick();
    if (hits.length === 0) {
      this.addSignal("safe_heartbeat", 0.4);
      return;
    }
    for (const hit of hits) {
      const kind = mapRuleKind(hit.rule.kind);
      this.addSignal(kind, hit.confidence);
    }
  }

  addSignal(kind: SignalKind, intensity: number): void {
    this.bins[kind] = Math.min(1, this.bins[kind] + intensity);
    this.engine.addSignal(kind, intensity);
    // Map signal into PDF-style spatial clusters for the NN grid.
    const [cx, cy] = kindToCluster(kind);
    const n = Math.max(1, Math.round(intensity * 8));
    for (let i = 0; i < n; i++) {
      this.grid.addPoint(cx + (Math.random() - 0.5) * 12, cy + (Math.random() - 0.5) * 12);
    }
  }

  snapshot(): DecisionRatio {
    const mass = this.engine.evaluate();
    const features = this.grid.getFeatures();
    this.lastNeural = this.neural.predictRatio(features);
    // Online label: threat-heavy mass ⇒ class 1
    const label: 0 | 1 = mass.threatSafeRatio >= 1.0 ? 1 : 0;
    this.neural.liveTrainStep(features, label);
    if (this.neural.falseReplaySize > 0 && Math.random() < 0.25) {
      this.neural.replayFalsePredictions(1);
    }

    // No threat mass → trust mass HOLD (avoid NN false positives on sparse grids).
    if (mass.threatMass < 1e-6) {
      return {
        ...mass,
        confidence: Math.max(mass.confidence, 0.5),
      };
    }

    const nn = this.lastNeural;
    const blendedRatio =
      nn.prob1 > 0.65 || nn.prob1 < 0.35
        ? nn.probRatio
        : (nn.probRatio + mass.threatSafeRatio) / 2;

    const action =
      blendedRatio >= 1.5 ? "contain" : blendedRatio >= 1.0 ? "escalate" : "hold";

    return {
      threatMass: mass.threatMass,
      safeMass: mass.safeMass,
      threatSafeRatio: blendedRatio,
      action,
      confidence: Math.max(mass.confidence, Math.abs(nn.prob1 - 0.5) * 2),
    };
  }

  lastNeuralPrediction(): RatioPrediction | undefined {
    return this.lastNeural;
  }

  binState(): Readonly<Record<SignalKind, number>> {
    return { ...this.bins };
  }
}

function kindToCluster(kind: SignalKind): [number, number] {
  switch (kind) {
    case "safe_heartbeat":
      return [25, 25];
    case "disallowed_host":
      return [78, 78];
    case "runaway_spawn":
      return [72, 55];
    case "constitution_breach":
      return [85, 70];
    case "sandbox_escape":
      return [90, 90];
    default: {
      const _never: never = kind;
      void _never;
      return [50, 50];
    }
  }
}

function mapRuleKind(
  kind: "disallowed_host" | "runaway_spawn" | "constitution_breach" | "sandbox_escape",
): SignalKind {
  switch (kind) {
    case "disallowed_host":
    case "runaway_spawn":
    case "constitution_breach":
    case "sandbox_escape":
      return kind;
    default: {
      const _never: never = kind;
      void _never;
      return "safe_heartbeat";
    }
  }
}
