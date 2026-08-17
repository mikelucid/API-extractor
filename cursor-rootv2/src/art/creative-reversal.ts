/**
 * Reverse creative reading of Mathematical Thinking AI.
 *
 * Same equations as decision realism:
 *   m:=m+a·Δt · R:=P_t(m)/P_s(m) · Σ grows with noise
 *
 * Flip the labels and you see where art comes from:
 * realism treats R as threat/safe; non-realism treats R as tension/release,
 * covariance as brush spread, centroid drift as composition.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { datasetsDir } from "../paths.js";
import {
  MathematicalThinkingAI,
  type MathDecision,
  type MathFeatures,
} from "../decision/math-thinking.js";
import { renderAsciiGrid } from "../demo/think-demo.js";
import { GridLiveRasterizer } from "../decision/grid-rasterizer.js";

export type RealismPole = "realistic" | "not_realistic";

export interface CreativeReversal {
  id: string;
  at: string;
  pole: RealismPole;
  features: MathFeatures;
  ratio: number;
  ascii: string;
  realismReading: string;
  artReading: string;
  whereArtComesFrom: string;
  prompt: string;
}

export interface ReversalSession {
  lines: string[];
  records: CreativeReversal[];
}

const REALISM_PROMPTS = [
  "Is this cloud a real threat cluster or only a painted density?",
  "Does Σ growth mean uncertainty in the world, or looseness of stroke?",
  "When R crosses 1, is that alarm — or the moment composition finds tension?",
];

const ART_PROMPTS = [
  "Forget threat. What does the centroid want to become?",
  "Treat P_threat/P_safe as chiaroscuro. Who owns the light?",
  "If a·Δt is a brush gesture, which gesture finishes the piece?",
];

export class CreativeThoughtRecorder {
  private readonly path: string;

  constructor(rootDir?: string) {
    const base = rootDir ? datasetsDir(rootDir) : datasetsDir();
    this.path = join(base, "creative-reversals.jsonl");
  }

  append(record: CreativeReversal): void {
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, `${JSON.stringify(record)}\n`, "utf8");
  }

  readAll(): CreativeReversal[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CreativeReversal);
  }
}

export function reverseFeatures(
  features: MathFeatures,
  ratio: number,
  ascii: string,
  pole: RealismPole,
): Omit<CreativeReversal, "id" | "at"> {
  const spread = features.covXX + features.covYY;
  const prompt =
    pole === "realistic"
      ? REALISM_PROMPTS[Math.floor(Math.random() * REALISM_PROMPTS.length)]!
      : ART_PROMPTS[Math.floor(Math.random() * ART_PROMPTS.length)]!;

  const realismReading =
    ratio >= 2
      ? `Realistic: centroid (${features.meanX.toFixed(1)},${features.meanY.toFixed(1)}) sits in threat-like density; R=${ratio.toFixed(3)} warrants contain.`
      : ratio >= 1
        ? `Realistic: borderline field — escalate/notify; covariance spread=${spread.toFixed(1)} is sensor noise.`
        : `Realistic: safe-like region; hold and keep observing. Σ is ordinary process noise.`;

  const artReading =
    ratio >= 2
      ? `Not-realistic: the mass crowds the upper-right — a hard chiaroscuro. R=${ratio.toFixed(3)} is compositional tension, not danger.`
      : ratio >= 1
        ? `Not-realistic: the piece hesitates mid-canvas. Spread=${spread.toFixed(1)} is brush looseness; the next a·Δt chooses drama or rest.`
        : `Not-realistic: quiet lower-left negative space. Low R is rest, breath, empty stage before the mark.`;

  const whereArtComesFrom =
    pole === "realistic"
      ? "Art hides inside realism when you notice the same Σ that meant 'noise' also means 'gesture width'."
      : "Art appears when you refuse the threat/safe names and keep the equations — density becomes pigment, R becomes tension.";

  return {
    pole,
    features,
    ratio,
    ascii,
    realismReading,
    artReading,
    whereArtComesFrom,
    prompt,
  };
}

/**
 * Run math thinking, then reverse each state into realistic + not-realistic readings
 * and record them for the owner.
 */
export async function runCreativeReversalSession(options: {
  rootDir: string;
  steps?: number;
  paceMs?: number;
  onLine?: (line: string) => void;
}): Promise<ReversalSession> {
  const steps = options.steps ?? 5;
  const paceMs = options.paceMs ?? 900;
  const recorder = new CreativeThoughtRecorder(options.rootDir);
  const math = new MathematicalThinkingAI();
  const viz = new GridLiveRasterizer({ xBins: 8, yBins: 8 });
  const lines: string[] = [];
  const records: CreativeReversal[] = [];

  const emit = (line: string) => {
    lines.push(line);
    options.onLine?.(line);
  };

  emit("agent · creative reversal");
  emit("same math · two readings: realistic * not_realistic");
  emit("thesis: art comes from keeping the equations after dropping the threat labels");
  emit("");

  for (let step = 0; step < steps; step++) {
    if (paceMs > 0) await sleep(paceMs);
    const t = step / Math.max(1, steps - 1);
    const cx = 25 + t * 55;
    const cy = 25 + t * 55;
    for (let i = 0; i < 12; i++) {
      const x = cx + (Math.random() - 0.5) * 10;
      const y = cy + (Math.random() - 0.5) * 10;
      math.observePoint(x, y);
      viz.addPoint(x, y);
    }

    const decision: MathDecision = math.decide(2);
    const ascii = renderAsciiGrid(viz.getFeatures(), 8);
    const pole: RealismPole = step % 2 === 0 ? "realistic" : "not_realistic";
    const partial = reverseFeatures(decision.current, decision.currentRatio, ascii, pole);
    const record: CreativeReversal = {
      id: `cr_${Date.now().toString(36)}_${step}`,
      at: new Date().toISOString(),
      ...partial,
    };
    recorder.append(record);
    records.push(record);

    emit(`── step ${step + 1}/${steps} · pole=${pole} ──`);
    emit(ascii);
    emit(`prompt: ${record.prompt}`);
    emit(`realistic*: ${record.realismReading}`);
    emit(`not-realistic*: ${record.artReading}`);
    emit(`where art comes from: ${record.whereArtComesFrom}`);
    emit(`math action still: ${decision.best.action.id}  E[R]=${decision.best.expectedRatio.toFixed(3)}`);
    emit("");
  }

  emit(`recorded ${records.length} reversals → datasets/creative-reversals.jsonl`);
  return { lines, records };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
