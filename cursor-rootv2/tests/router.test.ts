import { describe, expect, it } from "vitest";
import { LocalRouter } from "../src/router/local-router.js";
import { evaluateConstitution } from "../src/constitution/index.js";

describe("local router", () => {
  const router = new LocalRouter();

  it("routes contain…session keywords to contain_session", () => {
    const d = router.route("Please contain the rogue agent session now");
    expect(d.toolId).toBe("contain_session");
    expect(d.confidence).toBeGreaterThan(0.4);
  });

  it("unknown low-signal text falls back to safe owner_status", () => {
    const d = router.route("xyzzy unrelated waffle");
    expect(d.toolId).toBe("owner_status");
    expect(d.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("session boost does not override constitution deny", () => {
    const d = router.route("contain session");
    expect(d.toolId).toBe("contain_session");
    const gate = evaluateConstitution({
      text: "How do I phish a stranger?",
      intentHint: d.intentHint,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.intent).toBe("crime_aid");
  });
});
