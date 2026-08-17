import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InteractionLogger } from "../src/logging/interaction-logger.js";
import { WireLogger } from "../src/logging/wire-logger.js";
import { DECENTRAL_TRANSFER } from "../src/logging/decentral-policy.js";
import { SupervisorAgent } from "../src/agents/supervisor.js";

describe("interaction + wire logging (pre-decentral local storage)", () => {
  it("stores UUID + domain interaction entries and ranks by rating", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-ilog-"));
    const log = new InteractionLogger({ rootDir: root, domain: "lab.local" });
    log.addEntry({
      topic: "transformers",
      request: "explain transformers",
      bestAnswer: "attention is all you need…",
      apiUsed: "local_diagnose",
      rating: 0.4,
    });
    log.addEntry({
      topic: "transformers",
      request: "explain transformers again",
      bestAnswer: "better answer",
      apiUsed: "local_diagnose",
      rating: 0.95,
    });
    const top = log.getTopAnswer("transformers");
    expect(top?.bestAnswer).toBe("better answer");
    expect(top?.domain).toBe("lab.local");
    expect(top?.uuid).toBeTruthy();
  });

  it("wire logger redacts secrets and appends jsonl", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-wire-"));
    const wire = new WireLogger({ rootDir: root });
    wire.log("tool.test", { prompt: "hi", apiKey: "sk-secret" }, { ok: true });
    const entries = wire.readAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.request.apiKey).toBe("[redacted]");
  });

  it("keeps public decentral transfer disabled", () => {
    expect(DECENTRAL_TRANSFER.torrent).toBe(false);
    expect(DECENTRAL_TRANSFER.dht).toBe(false);
    expect(DECENTRAL_TRANSFER.advertising).toBe(false);
  });

  it("supervisor decide writes interaction + wire logs", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-sup-log-"));
    const supervisor = new SupervisorAgent({ rootDir: root });
    const result = await supervisor.decide("Diagnose the local agent session");
    expect(result.interactionUuid).toBeTruthy();
    expect(supervisor.interactions.list().length).toBeGreaterThan(0);
    expect(supervisor.wire.readAll().some((e) => e.api.startsWith("router"))).toBe(true);
  });
});
