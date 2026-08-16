import { describe, expect, it } from "vitest";
import {
  LightweightCritic,
  ThoughtLoop,
  chooseBestAction,
  predictFutureRatio,
  thinkInitial,
} from "../src/thought/index.js";

describe("thought loop", () => {
  it("think_initial fails closed to HOLD when constitution denied", () => {
    const plan = thinkInitial({
      text: "x",
      threatSafeRatio: 9,
      constitutionAllowed: false,
    });
    expect(plan.action).toBe("hold");
  });

  it("bounds refinements and returns a plan", () => {
    const loop = new ThoughtLoop(new LightweightCritic(), 2);
    const result = loop.run({
      text: "diagnose local session",
      threatSafeRatio: 1.2,
      constitutionAllowed: true,
    });
    expect(result.refinements).toBeLessThanOrEqual(2);
    expect(["hold", "escalate", "contain"]).toContain(result.plan.action);
  });

  it("lookahead prefers safer predicted ratio", () => {
    const best = chooseBestAction([
      { action: "contain", predictedRatio: predictFutureRatio(2, "contain") },
      { action: "hold", predictedRatio: predictFutureRatio(2, "hold") },
      { action: "escalate", predictedRatio: predictFutureRatio(2, "escalate") },
    ]);
    expect(best).toBe("contain");
  });
});
