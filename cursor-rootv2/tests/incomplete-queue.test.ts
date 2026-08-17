import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  IncompleteThoughtQueue,
  completeThenContinue,
} from "../src/thoughts/incomplete-queue.js";

describe("incomplete thoughts always complete", () => {
  it("parks interrupted thoughts and drains them into prior conversation stitches", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-inq-"));
    const queue = new IncompleteThoughtQueue(root);
    queue.park({
      kind: "decide",
      seed: "Diagnose the local agent session for drift",
      priorConversationId: "conv_test",
      progressNote: "interrupted when user typed something new",
      partialLines: ["… was thinking about Σ growth"],
    });
    queue.park({
      kind: "think",
      seed: "drift scenario mid-step",
      priorConversationId: "conv_test",
    });
    expect(queue.pending()).toHaveLength(2);

    const { completed } = await queue.completeAll({ rootDir: root, paceMs: 0 });
    expect(completed).toHaveLength(2);
    expect(queue.pending()).toHaveLength(0);
    const stitches = queue.readStitches();
    expect(stitches).toHaveLength(2);
    expect(stitches[0]?.priorConversationId).toBe("conv_test");
  });

  it("completeThenContinue finishes leftovers before a new seed", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-ctc-"));
    const queue = new IncompleteThoughtQueue(root);
    queue.park({
      kind: "muse",
      seed: "realistic * not_realistic mid muse",
      priorConversationId: "conv_prior",
    });
    const result = await completeThenContinue({
      rootDir: root,
      newSeed: "user typed something new",
      paceMs: 0,
    });
    expect(result.completed.length).toBeGreaterThanOrEqual(1);
    expect(result.queue.pending()).toHaveLength(0);
  });
});
