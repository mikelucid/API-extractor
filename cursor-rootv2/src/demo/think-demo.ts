/**
 * A small live demo: watch the supervisor *think* with equations + a raster.
 * Optional paceMs slows each step for deliberate viewing.
 */
import {
  GridLiveRasterizer,
  MathematicalThinkingAI,
  bootstrapNeuralRatioPredictor,
} from "../decision/index.js";

export async function runThinkDemo(options: {
  scenario?: "threat" | "safe" | "drift";
  steps?: number;
  paceMs?: number;
  onLine?: (line: string) => void;
}): Promise<{
  lines: string[];
  finalAction: string;
  finalRatio: number;
}> {
  const scenario = options.scenario ?? "drift";
  const steps = options.steps ?? 8;
  const paceMs = options.paceMs ?? 0;
  const math = new MathematicalThinkingAI();
  const { predictor, raster: nnRaster } = bootstrapNeuralRatioPredictor(8, 24);
  const viz = new GridLiveRasterizer({ xBins: 8, yBins: 8 });

  const lines: string[] = [];
  const emit = (line: string) => {
    lines.push(line);
    options.onLine?.(line);
  };

  emit("cursor-rootv2 · mathematical thinking demo");
  emit("equations: m:=m+a·Δt · R:=P_threat(m)/P_safe(m) · E[R] over horizon");
  emit("");

  let finalAction = "hold";
  let finalRatio = 0;

  for (let step = 0; step < steps; step++) {
    if (paceMs > 0) await sleep(paceMs);
    const t = step / Math.max(1, steps - 1);
    if (scenario === "safe") {
      math.ingestTelemetry("safe", 0.7);
      seedCluster(viz, nnRaster, 25, 25, 12);
    } else if (scenario === "threat") {
      math.ingestTelemetry("threat", 0.95);
      seedCluster(viz, nnRaster, 78, 78, 12);
    } else {
      const cx = 25 + t * 55;
      const cy = 25 + t * 55;
      for (let i = 0; i < 10; i++) {
        const x = cx + (Math.random() - 0.5) * 10;
        const y = cy + (Math.random() - 0.5) * 10;
        math.observePoint(x, y);
        viz.addPoint(x, y);
        nnRaster.addPoint(x, y);
      }
    }

    const decision = math.decide(2);
    const nn = predictor.predictRatio(nnRaster.getFeatures());
    finalAction = decision.best.action.id;
    finalRatio = decision.currentRatio;

    emit(`── step ${step + 1}/${steps} (${scenario}) ──`);
    emit(renderAsciiGrid(viz.getFeatures(), 8));
    emit(
      `centroid (${decision.current.meanX.toFixed(1)}, ${decision.current.meanY.toFixed(1)})  ` +
        `R_math=${decision.currentRatio.toFixed(3)}  R_nn=${nn.probRatio.toFixed(3)}  ` +
        `→ ${decision.best.action.id}`,
    );
    for (const stepLine of decision.best.steps) {
      emit(`  ${stepLine.equation}`);
    }
    emit("");
  }

  emit(`decision: ${finalAction}  (final R=${finalRatio.toFixed(3)})`);
  emit("happy: explicit math + live raster + neural ratio, all local.");
  return { lines, finalAction, finalRatio };
}

function seedCluster(
  viz: GridLiveRasterizer,
  nn: GridLiveRasterizer,
  cx: number,
  cy: number,
  n: number,
): void {
  for (let i = 0; i < n; i++) {
    const x = cx + (Math.random() - 0.5) * 10;
    const y = cy + (Math.random() - 0.5) * 10;
    viz.addPoint(x, y);
    nn.addPoint(x, y);
  }
}

/** Density → braille-ish ASCII for an 8×8 feature vector. */
export function renderAsciiGrid(features: number[], bins: number): string {
  const chars = " ·░▒▓█";
  const rows: string[] = [];
  let max = 0;
  for (const v of features) max = Math.max(max, v);
  const scale = max > 0 ? 1 / max : 1;
  for (let y = bins - 1; y >= 0; y--) {
    let row = "  ";
    for (let x = 0; x < bins; x++) {
      const v = features[x * bins + y] ?? 0;
      const idx = Math.min(chars.length - 1, Math.floor(v * scale * (chars.length - 1)));
      row += chars[idx];
    }
    rows.push(row);
  }
  return rows.join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
