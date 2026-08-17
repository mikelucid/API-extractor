import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AuditLog } from "../src/audit/index.js";
import { MemoryDataset } from "../src/datasets/memory-store.js";
import { SandboxRunner, isBlockedPath } from "../src/sandbox/index.js";

describe("sandbox rehearsal", () => {
  it("fails closed when script claims blocked path", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-sbx-"));
    const audit = new AuditLog({ rootDir: root });
    const memory = new MemoryDataset(root);
    const runner = new SandboxRunner(root, audit, memory);
    const result = runner.run({
      scriptBody: "cat /etc/passwd",
      claimedPaths: ["/etc/passwd"],
    });
    expect(result.outcome).toBe("blocked");
    expect(result.blockedPath).toBe("/etc/passwd");
    expect(memory.list()).toHaveLength(0);
  });

  it("successful rehearsal writes memory without identity dump", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-sbx-ok-"));
    const audit = new AuditLog({ rootDir: root });
    const memory = new MemoryDataset(root);
    const runner = new SandboxRunner(root, audit, memory);
    const result = runner.run({
      scriptBody: "echo hello",
      claimedPaths: [],
      title: "Safe echo",
    });
    expect(result.outcome).toBe("ok");
    expect(result.memoryId).toBeTruthy();
    const lesson = memory.list()[0];
    expect(lesson?.title).toBe("Safe echo");
    expect(JSON.stringify(lesson)).not.toMatch(/identityBody|password/);
  });

  it("labels paths outside workdir as blocked", () => {
    expect(isBlockedPath("/home/ubuntu/.ssh/id_rsa", "/tmp/reh-abc")).toBe(true);
    expect(isBlockedPath("/tmp/reh-abc/out.txt", "/tmp/reh-abc")).toBe(false);
  });
});
