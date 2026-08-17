import { describe, expect, it } from "vitest";
import { LiveRasterizer } from "../src/decision/live-raster.js";
import { RatioEngine, decisionFromRatio } from "../src/decision/ratio.js";
import { DEFAULT_POLICY_RULES } from "../src/datasets/agent-store.js";

describe("decision ratio", () => {
  it("synthetic hit stream crosses contain threshold", () => {
    const raster = new LiveRasterizer(new RatioEngine({ containThreshold: 1.5 }));
    const rule = DEFAULT_POLICY_RULES.find((r) => r.kind === "disallowed_host")!;
    for (let i = 0; i < 5; i++) {
      raster.ingestHits([{ rule, confidence: 0.95, detail: "bad host" }]);
    }
    const snap = raster.snapshot();
    expect(snap.threatSafeRatio).toBeGreaterThan(1.5);
    expect(snap.action).toBe("contain");
  });

  it("safe heartbeats stay in hold", () => {
    const raster = new LiveRasterizer();
    for (let i = 0; i < 5; i++) raster.ingestHits([]);
    const snap = raster.snapshot();
    expect(snap.action).toBe("hold");
  });

  it("decisionFromRatio maps bands", () => {
    expect(decisionFromRatio(0.2)).toBe("hold");
    expect(decisionFromRatio(1.2)).toBe("escalate");
    expect(decisionFromRatio(2.0)).toBe("contain");
  });
});
