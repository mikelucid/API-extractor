import { describe, expect, it } from "vitest";
import { QuantizedSwingDecision } from "../src/decision/quantized-swing.js";

describe("quantized swing hysteresis", () => {
  it("does not flutter around the escalate boundary", () => {
    const swing = new QuantizedSwingDecision({
      hysteresis: 0.15,
      escalateEnter: 1.0,
      containEnter: 1.5,
    });
    expect(swing.decide(0.9).action).toBe("hold");
    expect(swing.decide(1.05).action).toBe("hold"); // still inside deadband from HOLD
    expect(swing.decide(1.2).action).toBe("escalate");
    expect(swing.decide(1.05).action).toBe("escalate"); // hysteresis keeps escalate
    expect(swing.decide(0.8).action).toBe("hold");
  });

  it("maps high ratio to contain and holds until drop below deadband", () => {
    const swing = new QuantizedSwingDecision();
    expect(swing.decide(2.0).label).toBe("CONTAIN");
    expect(swing.decide(1.45).label).toBe("CONTAIN");
    expect(swing.decide(1.2).action).toBe("escalate");
  });
});
