import { describe, expect, it } from "vitest";
import {
  MathRasterizer,
  MathRatioPredictor,
  MathWorldModel,
  MathematicalThinkingAI,
  thinkAndChoose,
} from "../src/decision/math-thinking.js";
import { ThoughtLoop } from "../src/thought/index.js";

describe("Mathematical Thinking AI", () => {
  it("extracts centroid and covariance from live points", () => {
    const raster = new MathRasterizer();
    for (let i = 0; i < 30; i++) raster.addPoint(75 + Math.random(), 75 + Math.random());
    const f = raster.getMathFeatures();
    expect(f.n).toBe(30);
    expect(f.meanX).toBeGreaterThan(70);
    expect(f.meanY).toBeGreaterThan(70);
    expect(f.covXX).toBeGreaterThanOrEqual(0);
  });

  it("world model applies m:=m+a·Δt and grows covariance", () => {
    const world = new MathWorldModel(2);
    const next = world.predict(
      { meanX: 40, meanY: 40, covXX: 1, covYY: 1, covXY: 0, n: 10 },
      [2, 3],
      1,
    );
    expect(next.meanX).toBe(42);
    expect(next.meanY).toBe(43);
    expect(next.covXX).toBe(3);
  });

  it("Gaussian ratio is higher near threat cluster than safe cluster", () => {
    const pred = new MathRatioPredictor();
    const threat = pred.predictRatio({
      meanX: 75,
      meanY: 75,
      covXX: 10,
      covYY: 10,
      covXY: 0,
      n: 5,
    });
    const safe = pred.predictRatio({
      meanX: 25,
      meanY: 25,
      covXX: 10,
      covYY: 10,
      covXY: 0,
      n: 5,
    });
    expect(threat.ratio).toBeGreaterThan(safe.ratio);
  });

  it("thinkAndChoose emits an explicit reasoning trace", () => {
    const raster = new MathRasterizer();
    for (let i = 0; i < 40; i++) raster.addPoint(20 + Math.random() * 5, 20 + Math.random() * 5);
    const decision = thinkAndChoose({ current: raster.getMathFeatures(), horizon: 2 });
    expect(decision.trace.join("\n")).toMatch(/Mathematical Thinking|m:=m\+a/);
    expect(decision.best.action.id).toBeTruthy();
    expect(decision.candidates.length).toBeGreaterThan(1);
  });

  it("self-coding ThoughtLoop uses math AI in plan reasoning", () => {
    const loop = new ThoughtLoop();
    const result = loop.run({
      text: "Diagnose and contain the local rogue session",
      threatSafeRatio: 2.2,
      constitutionAllowed: true,
      telemetry: [{ kind: "threat", intensity: 1 }],
    });
    expect(result.math).toBeDefined();
    expect(result.plan.mathTrace?.length).toBeGreaterThan(0);
    expect(result.plan.reasoning).toMatch(/Mathematical Thinking|E\[R\]|R_now/);
    expect(["contain", "escalate", "hold"]).toContain(result.plan.action);
  });

  it("MathematicalThinkingAI end-to-end decide", () => {
    const ai = new MathematicalThinkingAI();
    ai.ingestTelemetry("threat", 1);
    const d = ai.decide();
    expect(d.currentRatio).toBeGreaterThan(0);
    expect(d.best.steps.length).toBe(2);
  });
});
