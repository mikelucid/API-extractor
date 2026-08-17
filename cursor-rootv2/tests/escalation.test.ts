import { describe, expect, it } from "vitest";
import { EscalationGate } from "../src/escalation/index.js";

describe("escalation gate", () => {
  it("auto_response_ratio=0 always escalates", () => {
    const gate = new EscalationGate({ autoResponseRatio: 0, escalationThreshold: 0.92 });
    const d = gate.evaluate({ urgency: 0.1, proposedAction: "contain" });
    expect(d.autoAct).toBe(false);
    expect(d.escalateToOwner).toBe(true);
  });

  it("high urgency contain still auto-acts (R3) and notifies owner", () => {
    const gate = new EscalationGate({ autoResponseRatio: 80, escalationThreshold: 0.92 });
    const d = gate.evaluate({ urgency: 0.95, proposedAction: "contain" });
    expect(d.autoAct).toBe(true);
    expect(d.escalateToOwner).toBe(true);
  });

  it("ratio=100 auto-contains when allowed", () => {
    const gate = new EscalationGate({ autoResponseRatio: 100, escalationThreshold: 0.99 });
    const d = gate.evaluate({ urgency: 0.5, proposedAction: "contain" });
    expect(d.autoAct).toBe(true);
    expect(d.escalateToOwner).toBe(false);
  });
});
