import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CreativeThoughtRecorder,
  reverseFeatures,
  runCreativeReversalSession,
} from "../src/art/creative-reversal.js";

describe("creative reversal · realistic * not_realistic", () => {
  it("emits both realism and art readings from the same features", () => {
    const r = reverseFeatures(
      { meanX: 78, meanY: 76, covXX: 12, covYY: 14, covXY: 1, n: 20 },
      3.2,
      "  ██",
      "not_realistic",
    );
    expect(r.realismReading).toMatch(/Realistic|threat|contain/i);
    expect(r.artReading).toMatch(/Not-realistic|chiaroscuro|tension/i);
    expect(r.whereArtComesFrom.length).toBeGreaterThan(20);
  });

  it("records reversals to jsonl for the owner", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-art-"));
    const session = await runCreativeReversalSession({
      rootDir: root,
      steps: 3,
      paceMs: 0,
    });
    expect(session.records).toHaveLength(3);
    expect(session.records.some((r) => r.pole === "realistic")).toBe(true);
    expect(session.records.some((r) => r.pole === "not_realistic")).toBe(true);
    const stored = new CreativeThoughtRecorder(root).readAll();
    expect(stored.length).toBe(3);
  });
});
