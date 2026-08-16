/** Live decision-ratio types (from Live Rating PDF — adapted to supervisor telemetry). */

export type DecisionAction = "contain" | "hold" | "escalate";

export type SignalKind =
  | "disallowed_host"
  | "runaway_spawn"
  | "constitution_breach"
  | "sandbox_escape"
  | "safe_heartbeat";

export interface DecisionSignal {
  kind: SignalKind;
  intensity: number; // 0..1
  at: string;
}

export interface DecisionRatio {
  threatMass: number;
  safeMass: number;
  /** P_threat / (P_safe + eps) */
  threatSafeRatio: number;
  action: DecisionAction;
  confidence: number;
}

export interface QuantLevel {
  quant: 0 | 1 | 2;
  action: DecisionAction;
  label: "HOLD" | "ESCALATE" | "CONTAIN";
}
