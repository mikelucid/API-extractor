import type { DecisionAction, QuantLevel } from "./types.js";

export interface QuantizedSwingOptions {
  /** Deadband around the HOLD/ESCALATE boundary (from QuantizedSwingDecision hysteresis). */
  hysteresis?: number;
  containEnter?: number;
  escalateEnter?: number;
}

/**
 * Quantize threat/safe ratio into HOLD / ESCALATE / CONTAIN with hysteresis
 * to prevent contain/release flutter (Live Rating PDF).
 */
export class QuantizedSwingDecision {
  private lastQuant: 0 | 1 | 2 = 0;
  private readonly hysteresis: number;
  private readonly containEnter: number;
  private readonly escalateEnter: number;

  constructor(options: QuantizedSwingOptions = {}) {
    this.hysteresis = options.hysteresis ?? 0.15;
    this.containEnter = options.containEnter ?? 1.5;
    this.escalateEnter = options.escalateEnter ?? 1.0;
  }

  decide(ratio: number): QuantLevel {
    const quant = this.quantizeRatio(ratio);
    this.lastQuant = quant;
    return mapQuant(quant);
  }

  /**
   * Port of QuantizedSwingDecision hysteresis:
   * if last was HOLD, require ratio > escalateEnter + hyst to leave HOLD;
   * if last was CONTAIN, require ratio < containEnter - hyst to drop.
   */
  private quantizeRatio(ratio: number): 0 | 1 | 2 {
    if (this.lastQuant === 0) {
      if (ratio >= this.containEnter + this.hysteresis) return 2;
      if (ratio >= this.escalateEnter + this.hysteresis) return 1;
      return 0;
    }
    if (this.lastQuant === 2) {
      if (ratio < this.containEnter - this.hysteresis) {
        return ratio >= this.escalateEnter ? 1 : 0;
      }
      return 2;
    }
    // lastQuant === 1 (escalate band)
    if (ratio >= this.containEnter + this.hysteresis) return 2;
    if (ratio < this.escalateEnter - this.hysteresis) return 0;
    return 1;
  }

  reset(): void {
    this.lastQuant = 0;
  }
}

function mapQuant(quant: 0 | 1 | 2): QuantLevel {
  switch (quant) {
    case 0:
      return { quant, action: "hold", label: "HOLD" };
    case 1:
      return { quant, action: "escalate", label: "ESCALATE" };
    case 2:
      return { quant, action: "contain", label: "CONTAIN" };
    default: {
      const _never: never = quant;
      return { quant: 0, action: "hold" as DecisionAction, label: "HOLD" };
      void _never;
    }
  }
}
