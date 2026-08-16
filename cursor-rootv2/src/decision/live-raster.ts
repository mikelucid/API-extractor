import type { DetectorHit } from "../agents/types.js";
import { RatioEngine } from "./ratio.js";
import type { DecisionRatio, SignalKind } from "./types.js";

/**
 * Live “raster” of supervisor telemetry into fixed feature bins.
 * From LiveRasterizer in the Live Rating PDF — GIS imagery replaced with detector bins.
 */
export class LiveRasterizer {
  readonly engine: RatioEngine;
  private bins: Record<SignalKind, number> = {
    disallowed_host: 0,
    runaway_spawn: 0,
    constitution_breach: 0,
    sandbox_escape: 0,
    safe_heartbeat: 0,
  };

  constructor(engine = new RatioEngine()) {
    this.engine = engine;
  }

  /** Decay bins slightly each tick so old hits fade (live grid refresh). */
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
  }

  snapshot(): DecisionRatio {
    return this.engine.evaluate();
  }

  binState(): Readonly<Record<SignalKind, number>> {
    return { ...this.bins };
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
