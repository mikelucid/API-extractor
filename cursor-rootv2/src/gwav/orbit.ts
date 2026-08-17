import { promptGwav } from "./prompt.js";
import type { GwavFile } from "./types.js";
import { GWAV_NODES, NODE_TO_PORT, type GwavNodeId } from "./types.js";
import { GwavVault } from "./vault.js";

export interface OrbitStep {
  node: GwavNodeId;
  port: string;
  absorbedFrom: GwavNodeId;
  line: string;
  ok: boolean;
  costUsd: 0;
}

/** Local JSONL distillation slice from an orbit (no HuggingFace scrape). */
export function orbitToJsonl(steps: OrbitStep[]): string {
  return (
    steps
      .map((s) =>
        JSON.stringify({
          node: s.node,
          port: s.port,
          absorbedFrom: s.absorbedFrom,
          completion: s.line,
          ok: s.ok,
          costUsdPerMillionTokens: 0,
        }),
      )
      .join("\n") + (steps.length ? "\n" : "")
  );
}

/**
 * Six-around-one orbital reflection: each gem node absorbs its neighbor's last
 * line (document: 6 in a circle, hub origin). Bounded, local, constitution-gated.
 */
export function runOrbit(vault: GwavVault, seed: string, steps = 6): OrbitStep[] {
  const ring = GWAV_NODES.filter((n) => n !== "origin") as GwavNodeId[];
  const out: OrbitStep[] = [];
  let last = seed;
  let lastNode: GwavNodeId = "origin";
  for (let i = 0; i < steps; i++) {
    const node = ring[i % ring.length]!;
    const file: GwavFile = vault.load(node);
    const result = promptGwav(file, last, { intentHint: "local_diagnose" });
    const line = result.ok ? (result.answer ?? "") : `hold: ${result.reason}`;
    out.push({
      node,
      port: NODE_TO_PORT[node],
      absorbedFrom: lastNode,
      line,
      ok: result.ok,
      costUsd: 0,
    });
    last = line;
    lastNode = node;
    if (!result.ok) break;
  }
  return out;
}
