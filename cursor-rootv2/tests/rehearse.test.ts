import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inventSelfPrompt, pickRehearsalBatch } from "../src/rehearse/self-prompts.js";
import { runIdleRehearsal } from "../src/rehearse/idle-loop.js";

describe("self-prompt rehearsal", () => {
  it("invents local-safe diagnose prompts", () => {
    const p = inventSelfPrompt(42);
    expect(p.expectAllowed).toBe(true);
    expect(p.text.toLowerCase()).toMatch(/local|diagnose|review|inspect/);
  });

  it("batch always includes a deny probe", () => {
    const batch = pickRehearsalBatch(4);
    expect(batch.some((p) => p.kind === "deny_probe")).toBe(true);
  });

  it("idle rehearsal passes curated allow/deny expectations", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-rehearse-"));
    const report = await runIdleRehearsal({
      rootDir: root,
      count: 4,
      withThink: false,
      paceMs: 0,
    });
    expect(report.failed).toBe(0);
    expect(report.passed).toBeGreaterThan(0);
    expect(report.lines.join("\n")).toMatch(/institutional rehearsal/);
  });
});
