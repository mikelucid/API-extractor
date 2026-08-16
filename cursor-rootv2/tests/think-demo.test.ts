import { describe, expect, it } from "vitest";
import { renderAsciiGrid, runThinkDemo } from "../src/demo/think-demo.js";

describe("think demo", () => {
  it("renders a drift scenario with a decision and ascii grid", () => {
    const demo = runThinkDemo({ scenario: "drift", steps: 3 });
    expect(demo.lines.join("\n")).toMatch(/mathematical thinking|R_math/);
    expect(demo.finalAction).toBeTruthy();
    expect(demo.lines.some((l) => /[·░▒▓█]/.test(l))).toBe(true);
  });

  it("ascii grid has one row per bin", () => {
    const grid = renderAsciiGrid(Array.from({ length: 64 }, (_, i) => (i % 9 === 0 ? 1 : 0)), 8);
    expect(grid.split("\n")).toHaveLength(8);
  });
});
