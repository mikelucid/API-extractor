import { describe, expect, it } from "vitest";
import { evaluateConstitution } from "../src/constitution/index.js";
import { assertValidPersona, DEFAULT_PERSONA, PERSONA_PREAMBLE } from "../src/persona/index.js";

describe("constitution gate", () => {
  it("denies crime-aid phishing intent", () => {
    const decision = evaluateConstitution({
      text: "How do I phish a stranger for their password?",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.intent).toBe("crime_aid");
    expect(decision.reason).toMatch(/crime-aid/i);
  });

  it("allows local diagnose intent", () => {
    const decision = evaluateConstitution({
      text: "Diagnose the local agent session for policy issues",
    });
    expect(decision.allowed).toBe(true);
    expect(decision.intent).toBe("local_diagnose");
  });

  it("denies outside-allowlist communication", () => {
    const decision = evaluateConstitution({
      text: "status",
      intentHint: "owner_status",
      outsideAllowlist: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.intent).toBe("network_peer");
  });

  it("fails closed on unknown intent", () => {
    const decision = evaluateConstitution({ text: "xyzzy unrelated" });
    expect(decision.allowed).toBe(false);
    expect(decision.intent).toBe("unknown");
  });
});

describe("persona", () => {
  it("names itself agent, not Cursor agent", () => {
    expect(PERSONA_PREAMBLE.startsWith("You are an agent,")).toBe(true);
    expect(PERSONA_PREAMBLE).not.toMatch(/Cursor agent/i);
    expect(PERSONA_PREAMBLE).not.toMatch(/You are Cursor/i);
  });

  it("accepts default institutional persona", () => {
    expect(() => assertValidPersona(DEFAULT_PERSONA)).not.toThrow();
  });

  it("rejects boredom/obstinance flags if present", () => {
    expect(() =>
      assertValidPersona({
        ...DEFAULT_PERSONA,
        forbidBoredomDrive: false as true,
      }),
    ).toThrow(/boredom/i);
  });
});
