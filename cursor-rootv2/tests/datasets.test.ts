import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AgentDatasetStore,
  FIXTURE_AGENTS,
  FIXTURE_MEMORY,
  IdentityDatasetStore,
  MemoryDataset,
  createPolicyRulesDataset,
  fixtureBundle,
} from "../src/datasets/index.js";

describe("datasets", () => {
  it("persists agent registry dataset", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-agents-ds-"));
    const store = new AgentDatasetStore(root);
    const agent = store.register({
      name: "coder",
      argvPrefix: "node ./agents/coder.js",
      tags: ["dev"],
    });
    const reloaded = new AgentDatasetStore(root);
    expect(reloaded.get(agent.id)?.name).toBe("coder");
    expect(reloaded.isAllowlisted(["node", "./agents/coder.js"])?.id).toBe(agent.id);
  });

  it("writes structured memory without secret fields", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-mem-"));
    const memory = new MemoryDataset(root);
    memory.append({
      kind: "lesson",
      title: "Containment pattern",
      summary: "Stop runaway spawn",
      tags: ["spawn"],
      relatedRuleIds: ["rule_runaway_spawn"],
      relatedAgentIds: [],
    });
    expect(memory.list()).toHaveLength(1);
    expect(() =>
      memory.append({
        kind: "lesson",
        title: "bad",
        summary: "x",
        tags: [],
        relatedRuleIds: [],
        relatedAgentIds: [],
        secret: "nope",
      } as never),
    ).toThrow(/secret/i);
  });

  it("encrypts identity dataset and round-trips", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-idn-"));
    const store = new IdentityDatasetStore("test-pass", root);
    const alice = store.enroll({
      id: "idn_alice",
      consent: "self_enrolled",
      fields: { displayName: "Alice", labels: ["lab"] },
    });
    const reloaded = new IdentityDatasetStore("test-pass", root);
    expect(reloaded.get(alice.id)?.fields.displayName).toBe("Alice");
  });

  it("exposes fixture bundle for agents/memory/identity/policy", () => {
    const bundle = fixtureBundle();
    expect(bundle.agents).toEqual(FIXTURE_AGENTS);
    expect(bundle.memory).toEqual(FIXTURE_MEMORY);
    expect(bundle.identities).toHaveLength(3);
    expect(createPolicyRulesDataset().rules.length).toBeGreaterThan(0);
  });
});
