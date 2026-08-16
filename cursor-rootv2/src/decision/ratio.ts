import type { DecisionAction, DecisionRatio, DecisionSignal, SignalKind } from "./types.js";

const THREAT_KINDS: ReadonlySet<SignalKind> = new Set([
  "disallowed_host",
  "runaway_spawn",
  "constitution_breach",
  "sandbox_escape",
]);

export interface RatioEngineOptions {
  /** Ratio above which we prefer contain (default from Live Rating RATIO_THRESHOLD pattern). */
  containThreshold?: number;
  escalateThreshold?: number;
  epsilon?: number;
  windowSize?: number;
}

/**
 * Convert a stream of live signals into a threat/safe ratio for decisions.
 * Adapted from `decision_from_ratio` / classifier ratio in the Live Rating extract.
 */
export class RatioEngine {
  private readonly containThreshold: number;
  private readonly escalateThreshold: number;
  private readonly epsilon: number;
  private readonly windowSize: number;
  private signals: DecisionSignal[] = [];

  constructor(options: RatioEngineOptions = {}) {
    this.containThreshold = options.containThreshold ?? 1.5;
    this.escalateThreshold = options.escalateThreshold ?? 1.0;
    this.epsilon = options.epsilon ?? 1e-6;
    this.windowSize = options.windowSize ?? 32;
  }

  addSignal(kind: SignalKind, intensity: number, at = new Date().toISOString()): void {
    this.signals.push({
      kind,
      intensity: clamp01(intensity),
      at,
    });
    if (this.signals.length > this.windowSize) {
      this.signals = this.signals.slice(-this.windowSize);
    }
  }

  clear(): void {
    this.signals = [];
  }

  evaluate(extra: DecisionSignal[] = []): DecisionRatio {
    const window = [...this.signals, ...extra];
    let threatMass = 0;
    let safeMass = 0;
    for (const s of window) {
      if (THREAT_KINDS.has(s.kind)) threatMass += s.intensity;
      else safeMass += s.intensity;
    }
    if (window.length === 0) {
      safeMass = 1;
    }
    const threatSafeRatio = threatMass / (safeMass + this.epsilon);
    const action = decisionFromRatio(threatSafeRatio, this.containThreshold, this.escalateThreshold);
    const confidence = clamp01(Math.abs(threatSafeRatio - 1) / (this.containThreshold + 1));
    return { threatMass, safeMass, threatSafeRatio, action, confidence };
  }
}

export function decisionFromRatio(
  ratio: number,
  containThreshold = 1.5,
  escalateThreshold = 1.0,
): DecisionAction {
  if (ratio >= containThreshold) return "contain";
  if (ratio >= escalateThreshold) return "escalate";
  return "hold";
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
