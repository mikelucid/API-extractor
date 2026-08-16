export interface EscalationConfig {
  /** 0–100: percent of containable hits handled automatically when below threshold. */
  autoResponseRatio: number;
  /** Urgency (0..1) at/above which mid-band actions escalate to owner (skip auto-kill). */
  escalationThreshold: number;
}

export interface EscalationInput {
  urgency: number;
  proposedAction: "contain" | "hold" | "escalate";
}

export interface EscalationDecision {
  autoAct: boolean;
  escalateToOwner: boolean;
  reason: string;
}

/**
 * From Legal.ai AiLegalService.requiresHumanIntervention + auto_response_ratio.
 * Adapted for Rootv2 R3: confirmed contain (swing) still auto-acts unless
 * auto_response_ratio is 0. High urgency on non-contain actions escalates.
 */
export class EscalationGate {
  constructor(private readonly config: EscalationConfig) {}

  evaluate(input: EscalationInput): EscalationDecision {
    const ratio = clamp(this.config.autoResponseRatio, 0, 100);
    if (ratio <= 0) {
      return {
        autoAct: false,
        escalateToOwner: true,
        reason: "auto_response_ratio=0 — always escalate to owner.",
      };
    }

    if (input.proposedAction === "hold") {
      return {
        autoAct: true,
        escalateToOwner: false,
        reason: "Hold action — continue watching.",
      };
    }

    if (input.proposedAction === "escalate") {
      return {
        autoAct: false,
        escalateToOwner: true,
        reason: "Proposed escalate — owner notify, no auto-kill.",
      };
    }

    // proposedAction === contain (confirmed by quantized swing)
    if (input.urgency >= this.config.escalationThreshold) {
      return {
        autoAct: true,
        escalateToOwner: true,
        reason:
          "High urgency contain — auto-contain per R3 and escalate/notify owner.",
      };
    }

    const autoOk = input.urgency <= ratio / 100 || ratio >= 80;
    if (!autoOk) {
      return {
        autoAct: false,
        escalateToOwner: true,
        reason: "Outside auto_response_ratio band — escalate without kill.",
      };
    }

    return {
      autoAct: true,
      escalateToOwner: false,
      reason: "Within auto_response_ratio — auto-contain allowed.",
    };
  }
}

export const DEFAULT_ESCALATION: EscalationConfig = {
  autoResponseRatio: 80,
  escalationThreshold: 0.92,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
