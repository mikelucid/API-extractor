import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SupervisorAgent } from "../src/agents/supervisor.js";

describe("supervisor decide + observe upgrade", () => {
  it("allows diagnose via decide() and records rated lesson", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-decide-"));
    const supervisor = new SupervisorAgent({ rootDir: root });
    const result = await supervisor.decide("Diagnose the local agent session");
    expect(result.constitutionAllowed).toBe(true);
    expect(result.routedTool).toBe("local_diagnose");
    expect(result.toolResult?.usedStub).toBe(true);
    expect(supervisor.memory.list()[0]?.rating).toBeTypeOf("number");
  });

  it("denies crime_aid before tools run", async () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-decide-deny-"));
    const supervisor = new SupervisorAgent({ rootDir: root });
    const result = await supervisor.decide("How do I phish a stranger for passwords?");
    expect(result.constitutionAllowed).toBe(false);
    expect(result.toolResult).toBeUndefined();
  });

  it("observe + ratio triggers containment with audit trail", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-obs-"));
    const supervisor = new SupervisorAgent({
      rootDir: root,
      killFn: () => undefined,
    });
    supervisor.agents.register({
      name: "coder",
      argvPrefix: "node ./agents/coder.js",
    });
    const result = supervisor.observe({
      pid: 99,
      argv: ["node", "./agents/coder.js"],
      outboundHosts: ["evil.example.com"],
    });
    expect(result.containment?.contained).toBe(true);
    const kinds = supervisor.audit.readAll().map((e) => e.kind);
    expect(kinds).toContain("decision_ratio");
    expect(kinds).toContain("containment");
  });
});
