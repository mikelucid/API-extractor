import type { DecisionAction } from "../decision/types.js";
import {
  MathematicalThinkingAI,
  type MathDecision,
} from "../decision/math-thinking.js";

export interface ThoughtPlan {
  reasoning: string;
  action: DecisionAction;
  steps: string[];
  risk: number;
  mathTrace?: string[];
}

export interface CriticResult {
  satisfied: boolean;
  score: number;
  notes: string[];
}

/** LightweightCritic from Coding agent / Live Rating — heuristic, no VLM. */
export class LightweightCritic {
  evaluate(plan: ThoughtPlan): CriticResult {
    const notes: string[] = [];
    let score = 0.7;
    if (plan.steps.length === 0) {
      notes.push("Plan has no steps.");
      score -= 0.3;
    }
    if (plan.action === "contain" && plan.risk < 0.5) {
      notes.push("Containment proposed at low risk — prefer hold.");
      score -= 0.25;
    }
    if (plan.action === "hold" && plan.risk > 0.85) {
      notes.push("Holding despite high risk — prefer escalate/contain.");
      score -= 0.2;
    }
    if (!plan.reasoning.trim()) {
      notes.push("Empty reasoning.");
      score -= 0.2;
    }
    score = Math.max(0, Math.min(1, score));
    return { satisfied: score >= 0.55, score, notes };
  }
}

export function thinkInitial(input: {
  text: string;
  threatSafeRatio: number;
  constitutionAllowed: boolean;
  math?: MathDecision;
}): ThoughtPlan {
  if (!input.constitutionAllowed) {
    return {
      reasoning: "Constitution denied — fail closed to HOLD.",
      action: "hold",
      steps: ["audit denial", "notify owner"],
      risk: 0,
    };
  }
  try {
    if (input.math) {
      return planFromMath(input.math, input.text);
    }
    return parseOrBuildPlan(input);
  } catch {
    return {
      reasoning: "Fallback due to parsing error.",
      action: "hold",
      steps: ["audit parse failure", "hold session"],
      risk: input.threatSafeRatio > 1 ? 0.6 : 0.2,
    };
  }
}

/** Map explicit math decision into a supervisor thought plan (self-coding path). */
export function planFromMath(math: MathDecision, text: string): ThoughtPlan {
  const action = mapMathAction(math.best.action.id);
  return {
    reasoning: [
      `Mathematical Thinking AI on "${text.slice(0, 60)}":`,
      `R_now=${math.currentRatio.toFixed(3)}; chose ${math.best.action.id}`,
      `E[R]=${math.best.expectedRatio.toFixed(3)} via m:=m+a·Δt, R:=P_t/P_s`,
      math.trace.slice(-3).join(" | "),
    ].join(" "),
    action,
    steps: [
      "explicit math simulate horizon",
      ...math.best.steps.map((s) => s.equation),
      action === "contain" ? "SIGTERM → quarantine" : action === "escalate" ? "owner notify" : "continue watch",
    ],
    risk: Math.min(1, math.currentRatio / 3),
    mathTrace: math.trace,
  };
}

function mapMathAction(id: string): DecisionAction {
  switch (id) {
    case "contain":
      return "contain";
    case "escalate":
      return "escalate";
    case "hold":
    case "toward_safe":
      return "hold";
    default:
      return "hold";
  }
}

function parseOrBuildPlan(input: {
  text: string;
  threatSafeRatio: number;
}): ThoughtPlan {
  const ratio = input.threatSafeRatio;
  if (ratio >= 1.5) {
    return {
      reasoning: "High threat/safe ratio — propose containment after rehearsal.",
      action: "contain",
      steps: ["sandbox what-if", "SIGTERM", "quarantine", "audit"],
      risk: Math.min(1, ratio / 3),
    };
  }
  if (ratio >= 1.0) {
    return {
      reasoning: "Elevated ratio — escalate to owner before irreversible kill.",
      action: "escalate",
      steps: ["audit urgency", "owner notify stub"],
      risk: Math.min(1, ratio / 2.5),
    };
  }
  return {
    reasoning: `Nominal ratio (${ratio.toFixed(2)}) — continue watching.`,
    action: "hold",
    steps: ["observe", "update live raster"],
    risk: Math.max(0.05, ratio / 3),
  };
}

export function refinePlan(plan: ThoughtPlan, critic: CriticResult): ThoughtPlan {
  if (critic.satisfied) return plan;
  if (plan.action === "contain" && critic.notes.some((n) => /low risk/i.test(n))) {
    return {
      ...plan,
      action: "escalate",
      reasoning: `${plan.reasoning} Refined after critic: escalate instead of contain.`,
      steps: ["owner notify stub", "continue watch"],
    };
  }
  if (plan.action === "hold" && critic.notes.some((n) => /high risk/i.test(n))) {
    return {
      ...plan,
      action: "escalate",
      reasoning: `${plan.reasoning} Refined after critic: escalate from hold.`,
      steps: ["owner notify stub"],
    };
  }
  return {
    ...plan,
    reasoning: `${plan.reasoning} Critic notes: ${critic.notes.join("; ")}`,
  };
}

export function chooseBestAction(
  candidates: Array<{ action: DecisionAction; predictedRatio: number }>,
): DecisionAction {
  const ranked = [...candidates].sort((a, b) => {
    if (a.predictedRatio !== b.predictedRatio) return a.predictedRatio - b.predictedRatio;
    const order: Record<DecisionAction, number> = { hold: 0, escalate: 1, contain: 2 };
    return order[a.action] - order[b.action];
  });
  return ranked[0]?.action ?? "hold";
}

export function predictFutureRatio(current: number, action: DecisionAction): number {
  switch (action) {
    case "contain":
      return current * 0.35;
    case "escalate":
      return current * 0.7;
    case "hold":
      return current * 1.05;
    default: {
      const _never: never = action;
      void _never;
      return current;
    }
  }
}

/**
 * Self-coding thought loop: Mathematical Thinking AI (explicit equations)
 * seeds the plan; critic + lookahead refine.
 */
export class ThoughtLoop {
  readonly mathAI = new MathematicalThinkingAI();

  constructor(
    private readonly critic = new LightweightCritic(),
    private readonly maxRefinements = 3,
  ) {}

  run(input: {
    text: string;
    threatSafeRatio: number;
    constitutionAllowed: boolean;
    /** Optional telemetry seeds for MathRasterizer before decide. */
    telemetry?: Array<{ kind: "safe" | "threat" | "spawn" | "breach" | "escape"; intensity?: number }>;
  }): { plan: ThoughtPlan; refinements: number; critic: CriticResult; math?: MathDecision } {
    if (input.telemetry) {
      for (const t of input.telemetry) {
        this.mathAI.ingestTelemetry(t.kind, t.intensity ?? 0.8);
      }
    } else {
      // Seed from threatSafeRatio so math path always has a cloud to reason over.
      if (input.threatSafeRatio >= 1.5) this.mathAI.ingestTelemetry("threat", 0.95);
      else if (input.threatSafeRatio >= 1.0) this.mathAI.ingestTelemetry("spawn", 0.7);
      else this.mathAI.ingestTelemetry("safe", 0.5);
    }

    const math = this.mathAI.decide(2);
    let plan = thinkInitial({ ...input, math });
    let refinements = 0;
    let critique = this.critic.evaluate(plan);
    while (!critique.satisfied && refinements < this.maxRefinements) {
      plan = refinePlan(plan, critique);
      const candidates: DecisionAction[] = ["hold", "escalate", "contain"];
      const best = chooseBestAction(
        candidates.map((action) => ({
          action,
          predictedRatio: predictFutureRatio(input.threatSafeRatio, action),
        })),
      );
      if (best !== plan.action && input.threatSafeRatio < 2) {
        plan = {
          ...plan,
          action: best,
          reasoning: `${plan.reasoning} Lookahead chose ${best}.`,
        };
      }
      critique = this.critic.evaluate(plan);
      refinements += 1;
    }
    return { plan, refinements, critic: critique, math };
  }
}
