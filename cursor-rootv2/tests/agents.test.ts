import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AuditLog } from "../src/audit/index.js";
import { AgentDatasetStore } from "../src/datasets/agent-store.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { SessionWatcher } from "../src/agents/watch.js";
import { SupervisorAgent } from "../src/agents/supervisor.js";
import { buildDefaultRules } from "../src/agents/types.js";

describe("agents watch/contain", () => {
  it("ignores non-allowlisted process", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-watch-"));
    const audit = new AuditLog({ rootDir: root });
    const registry = new AgentRegistry(new AgentDatasetStore(root), audit);
    registry.register({ name: "coder", argvPrefix: "node ./agents/coder.js" });
    const watcher = new SessionWatcher(registry, audit, { killFn: () => undefined });

    const result = watcher.observe({
      pid: 1001,
      argv: ["python", "evil.py"],
      outboundHosts: ["evil.example"],
    });
    expect(result.ignored).toBe(true);
    expect(result.containment).toBeUndefined();
    expect(audit.readAll().some((e) => e.kind === "watch_ignore")).toBe(true);
  });

  it("contains allowlisted agent on disallowed outbound host", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-contain-"));
    const signals: string[] = [];
    const supervisor = new SupervisorAgent({
      rootDir: root,
      killFn: (_pid, signal) => {
        signals.push(signal);
      },
    });
    supervisor.agents.register({
      name: "coder",
      argvPrefix: "node ./agents/coder.js",
    });

    const result = supervisor.observe({
      pid: 42,
      argv: ["node", "./agents/coder.js", "--watch"],
      outboundHosts: ["evil.example.com"],
    });

    expect(result.ignored).toBe(false);
    expect(result.containment?.contained).toBe(true);
    expect(result.session?.state).toBe("quarantined");
    expect(signals).toContain("SIGTERM");
    expect(signals).toContain("SIGKILL");

    const containment = supervisor.audit.readAll().find((e) => e.kind === "containment");
    expect(containment).toBeDefined();
    if (containment?.kind === "containment") {
      expect(containment.ruleId).toBe("rule_disallowed_host");
      expect(containment.processName).toBe("coder");
    }
  });

  it("does not contain when confidence is below threshold", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-thresh-"));
    const audit = new AuditLog({ rootDir: root });
    const registry = new AgentRegistry(new AgentDatasetStore(root), audit);
    registry.register({ name: "coder", argvPrefix: "node ./agents/coder.js" });

    const rules = buildDefaultRules([
      { kind: "runaway_spawn", confidenceThreshold: 0.99, maxSpawns: 1000 },
    ]);
    const watcher = new SessionWatcher(registry, audit, {
      rules,
      killFn: () => {
        throw new Error("should not kill");
      },
    });

    const result = watcher.observe({
      pid: 7,
      argv: ["node", "./agents/coder.js"],
      spawnCount: 2,
    });
    expect(result.containment).toBeUndefined();
    expect(result.session?.state).toBe("watching");
  });
});
