import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AuditLog, createAuditEvent, redactAuditEvent } from "../src/audit/index.js";

describe("audit log", () => {
  it("serializes containment with process, rule, action", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-audit-"));
    const audit = new AuditLog({ rootDir: root });
    audit.append(
      createAuditEvent({
        kind: "containment",
        summary: "Blocked host",
        processId: "4242",
        processName: "coder",
        ruleId: "rule_disallowed_host",
        action: "quarantine",
        confidence: 0.95,
      }),
    );
    const events = audit.readAll();
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event?.kind).toBe("containment");
    if (event?.kind === "containment") {
      expect(event.processId).toBe("4242");
      expect(event.ruleId).toBe("rule_disallowed_host");
      expect(event.action).toBe("quarantine");
    }
  });

  it("identity access audit has metadata only (no payload body)", () => {
    const event = createAuditEvent({
      kind: "identity_access",
      summary: "denied",
      requesterId: "idn_carol",
      subjectId: "idn_alice",
      allowed: false,
      fieldsRequested: ["displayName"],
    });
    const redacted = redactAuditEvent({
      ...event,
      payload: { displayName: "secret" },
      identityBody: { ssn: "nope" },
    } as typeof event & { payload: unknown; identityBody: unknown });
    expect(JSON.stringify(redacted)).not.toMatch(/secret|ssn|identityBody|payload/);
    expect(redacted.kind).toBe("identity_access");
  });
});
