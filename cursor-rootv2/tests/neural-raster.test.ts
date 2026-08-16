import { describe, expect, it } from "vitest";
import { GridLiveRasterizer } from "../src/decision/grid-rasterizer.js";
import {
  bootstrapNeuralRatioPredictor,
  decisionFromProbRatio,
  generateScenario,
  NeuralRatioPredictor,
} from "../src/decision/neural-ratio.js";
import { LiveRasterizer } from "../src/decision/live-raster.js";
import { DEFAULT_POLICY_RULES } from "../src/datasets/agent-store.js";

describe("neural network + live rasterizing", () => {
  it("grid rasterizer flattens fixed-size features", () => {
    const raster = new GridLiveRasterizer({ xBins: 8, yBins: 8 });
    for (const [x, y] of generateScenario(1, 20)) raster.addPoint(x, y);
    const features = raster.getFeatures();
    expect(features).toHaveLength(64);
    expect(features.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("MLP learns threat vs safe clusters and drives ratio decisions", () => {
    const { predictor, raster } = bootstrapNeuralRatioPredictor(8, 50);
    raster.clear();
    for (const [x, y] of generateScenario(1, 40)) raster.addPoint(x, y);
    const threat = predictor.predictRatio(raster.getFeatures());
    expect(threat.prob1).toBeGreaterThan(0.55);
    expect(threat.probRatio).toBeGreaterThan(1);

    raster.clear();
    for (const [x, y] of generateScenario(0, 40)) raster.addPoint(x, y);
    const safe = predictor.predictRatio(raster.getFeatures());
    expect(safe.prob1).toBeLessThan(0.45);
    expect(decisionFromProbRatio(safe.probRatio, 2)).toBe("hold");
  });

  it("online train records false predictions for replay", () => {
    const predictor = new NeuralRatioPredictor({ inputSize: 4, hidden1: 8, hidden2: 4 });
    const x = [0.9, 0.9, 0.1, 0.1];
    // Force a wrong label relative to random init enough times
    for (let i = 0; i < 5; i++) predictor.liveTrainStep(x, 1);
    predictor.replayFalsePredictions(2);
    expect(predictor.predictProb1(x)).toBeGreaterThan(0.4);
  });

  it("telemetry LiveRasterizer blends NN ratio on detector hits", () => {
    const raster = new LiveRasterizer();
    const rule = DEFAULT_POLICY_RULES.find((r) => r.kind === "disallowed_host")!;
    for (let i = 0; i < 6; i++) {
      raster.ingestHits([{ rule, confidence: 0.95, detail: "bad host" }]);
    }
    const snap = raster.snapshot();
    expect(snap.threatSafeRatio).toBeGreaterThan(1);
    expect(raster.lastNeuralPrediction()?.probRatio).toBeTypeOf("number");
  });
});
