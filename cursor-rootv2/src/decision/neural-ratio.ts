/**
 * Small MLP ratio predictor (Live Rating PDF: Neural Network + Live Rasterizing).
 * Pure TypeScript — no TensorFlow/PyTorch. Binary class → P1/(P0+ε) decision ratio.
 */

import { GridLiveRasterizer } from "./grid-rasterizer.js";

export interface MlpSpec {
  inputSize: number;
  hidden1?: number;
  hidden2?: number;
  learningRate?: number;
}

export interface RatioPrediction {
  prob1: number;
  prob0: number;
  /** P(class=1) / (P(class=0) + eps) */
  probRatio: number;
  action: "contain" | "hold";
}

export const DEFAULT_PROB_RATIO_THRESHOLD = 2.0;

export class NeuralRatioPredictor {
  private readonly lr: number;
  private w1: number[][];
  private b1: number[];
  private w2: number[][];
  private b2: number[];
  private w3: number[];
  private b3: number;
  private readonly falseReplay: Array<{ x: number[]; y: number }> = [];
  private readonly replayMax = 64;

  constructor(spec: MlpSpec) {
    const h1 = spec.hidden1 ?? 64;
    const h2 = spec.hidden2 ?? 32;
    this.lr = spec.learningRate ?? 0.05;
    this.w1 = randMatrix(h1, spec.inputSize);
    this.b1 = zeros(h1);
    this.w2 = randMatrix(h2, h1);
    this.b2 = zeros(h2);
    this.w3 = randVector(h2);
    this.b3 = 0;
  }

  predictProb1(features: number[]): number {
    const { a3 } = this.forward(features);
    return a3;
  }

  predictRatio(
    features: number[],
    threshold = DEFAULT_PROB_RATIO_THRESHOLD,
  ): RatioPrediction {
    const prob1 = this.predictProb1(features);
    const prob0 = 1 - prob1;
    const probRatio = prob1 / (prob0 + 1e-6);
    return {
      prob1,
      prob0,
      probRatio,
      action: decisionFromProbRatio(probRatio, threshold),
    };
  }

  /** Online single-example train step (PDF live_train_step). */
  liveTrainStep(features: number[], label: 0 | 1): number {
    const loss = this.trainOne(features, label);
    const pred = this.predictProb1(features) >= 0.5 ? 1 : 0;
    if (pred !== label) {
      this.falseReplay.push({ x: [...features], y: label });
      if (this.falseReplay.length > this.replayMax) {
        this.falseReplay.shift();
      }
    }
    return loss;
  }

  /** Replay stored false predictions (PDF online trainer). */
  replayFalsePredictions(rounds = 1): number {
    let total = 0;
    for (let r = 0; r < rounds; r++) {
      for (const sample of this.falseReplay) {
        total += this.trainOne(sample.x, sample.y as 0 | 1);
      }
    }
    return total;
  }

  trainBatch(xs: number[][], ys: Array<0 | 1>, epochs = 5): void {
    for (let e = 0; e < epochs; e++) {
      for (let i = 0; i < xs.length; i++) {
        this.trainOne(xs[i]!, ys[i]!);
      }
    }
  }

  get falseReplaySize(): number {
    return this.falseReplay.length;
  }

  private forward(x: number[]): {
    a1: number[];
    a2: number[];
    a3: number;
  } {
    const z1 = this.w1.map((row, i) => dot(row, x) + this.b1[i]!);
    const a1 = z1.map(relu);
    const z2 = this.w2.map((row, i) => dot(row, a1) + this.b2[i]!);
    const a2 = z2.map(relu);
    const z3 = dot(this.w3, a2) + this.b3;
    const a3 = sigmoid(z3);
    return { a1, a2, a3 };
  }

  private trainOne(x: number[], y: 0 | 1): number {
    const { a1, a2, a3 } = this.forward(x);
    const err = a3 - y;
    const loss = -(y * Math.log(a3 + 1e-9) + (1 - y) * Math.log(1 - a3 + 1e-9));

    const dz3 = err;
    for (let j = 0; j < this.w3.length; j++) {
      this.w3[j]! -= this.lr * dz3 * a2[j]!;
    }
    this.b3 -= this.lr * dz3;

    const da2 = this.w3.map((w) => w * dz3);
    const dz2 = da2.map((v, i) => v * reluDeriv(a2[i]!));
    for (let i = 0; i < this.w2.length; i++) {
      for (let j = 0; j < this.w2[i]!.length; j++) {
        this.w2[i]![j]! -= this.lr * dz2[i]! * a1[j]!;
      }
      this.b2[i]! -= this.lr * dz2[i]!;
    }

    const da1 = zeros(a1.length);
    for (let i = 0; i < this.w2.length; i++) {
      for (let j = 0; j < a1.length; j++) {
        da1[j]! += this.w2[i]![j]! * dz2[i]!;
      }
    }
    const dz1 = da1.map((v, i) => v * reluDeriv(a1[i]!));
    for (let i = 0; i < this.w1.length; i++) {
      for (let j = 0; j < x.length; j++) {
        this.w1[i]![j]! -= this.lr * dz1[i]! * x[j]!;
      }
      this.b1[i]! -= this.lr * dz1[i]!;
    }

    return loss;
  }
}

export function decisionFromProbRatio(
  probRatio: number,
  threshold = DEFAULT_PROB_RATIO_THRESHOLD,
): "contain" | "hold" {
  return probRatio > threshold ? "contain" : "hold";
}

/** Seed predictor on synthetic lower-left (safe=0) vs upper-right (threat=1) clusters. */
export function bootstrapNeuralRatioPredictor(
  rasterSize = 8,
  examplesPerClass = 40,
): { predictor: NeuralRatioPredictor; raster: GridLiveRasterizer } {
  const raster = new GridLiveRasterizer({ xBins: rasterSize, yBins: rasterSize });
  const predictor = new NeuralRatioPredictor({ inputSize: raster.featureSize });
  const xs: number[][] = [];
  const ys: Array<0 | 1> = [];
  for (const label of [0, 1] as const) {
    for (let i = 0; i < examplesPerClass; i++) {
      raster.clear();
      const points = generateScenario(label, 24);
      for (const [x, y] of points) raster.addPoint(x, y);
      xs.push(raster.getFeatures());
      ys.push(label);
    }
  }
  predictor.trainBatch(xs, ys, 8);
  raster.clear();
  return { predictor, raster };
}

export function generateScenario(label: 0 | 1, numPoints: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < numPoints; i++) {
    if (label === 0) {
      points.push([clamp(randNormal(25, 10), 0, 100), clamp(randNormal(25, 10), 0, 100)]);
    } else {
      points.push([clamp(randNormal(75, 10), 0, 100), clamp(randNormal(75, 10), 0, 100)]);
    }
  }
  return points;
}

function randNormal(mean: number, std: number): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function relu(x: number): number {
  return x > 0 ? x : 0;
}

function reluDeriv(a: number): number {
  return a > 0 ? 1 : 0;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

function zeros(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

function randVector(n: number): number[] {
  return Array.from({ length: n }, () => (Math.random() - 0.5) * 0.2);
}

function randMatrix(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => randVector(cols));
}
