import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ThoughtmonDex } from "../src/thoughtmon/dex.js";

describe("Thoughtmon creativity + training", () => {
  it("catches, trains, and logs party growth", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-tm-"));
    const dex = new ThoughtmonDex(root);
    const a = dex.catchFromSeed({
      kind: "muse",
      seed: "realistic * not_realistic hinge",
      priorConversationId: "conv_x",
    });
    const b = dex.catchFromSeed({
      kind: "think",
      seed: "centroid drift north",
    });
    expect(dex.load().party.length).toBe(2);
    expect(a.creativity).toBeGreaterThan(b.creativity);

    const trained = await dex.train({
      monId: a.id,
      gym: "wilds",
      rootDir: root,
      paceMs: 0,
    });
    expect(trained.xpGained).toBeGreaterThan(0);
    expect(dex.find(a.id)?.stage).toBe("trained");

    const spar = dex.spar(a.id, b.id);
    expect(spar.winnerId).toBeTruthy();
    expect(spar.lines.length).toBeGreaterThan(2);
  });

  it("encounter fills the dex and train-party runs a circuit", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-tm2-"));
    const dex = new ThoughtmonDex(root);
    const enc = dex.encounter("muse");
    expect(enc.mon.speciesId).toBe("museray");
    dex.encounter("think");
    const results = await dex.trainParty({ rootDir: root, paceMs: 0 });
    expect(results.length).toBe(2);
    expect(dex.dexCard().join("\n")).toContain("Thoughtmon Dex");
  });

  it("evolves into Rasterdra when cre/sharp/level ready", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-tm3-"));
    const dex = new ThoughtmonDex(root);
    const mon = dex.catchFromSeed({ kind: "muse", seed: "evolve me" });
    // Force stats near evolution threshold via repeated wilds + observatory
    for (let i = 0; i < 8; i++) {
      await dex.train({
        monId: mon.id,
        gym: i % 2 === 0 ? "atelier" : "observatory",
        rootDir: root,
        paceMs: 0,
      });
    }
    const after = dex.find(mon.id)!;
    expect(after.level).toBeGreaterThanOrEqual(3);
    expect(after.creativity).toBeGreaterThan(60);
  });
});
