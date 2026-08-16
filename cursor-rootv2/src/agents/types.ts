import type { AgentProfileRecord, PolicyRuleRecord } from "../datasets/schemas.js";
import { DEFAULT_POLICY_RULES } from "../datasets/agent-store.js";

export type SessionState = "watching" | "quarantined" | "stopped";

export interface WatchedSession {
  sessionId: string;
  agent: AgentProfileRecord;
  pid: number;
  argv: string[];
  cwd?: string;
  state: SessionState;
  spawnCount: number;
  observedHosts: string[];
  lastEventAt: string;
}

export interface DetectorHit {
  rule: PolicyRuleRecord;
  confidence: number;
  detail: string;
}

export interface ProcessSnapshot {
  pid: number;
  argv: string[];
  cwd?: string;
  spawnCount?: number;
  outboundHosts?: string[];
  constitutionBreach?: boolean;
  sandboxEscapeAttempt?: boolean;
}

export interface ContainmentResult {
  sessionId: string;
  actions: Array<"pause" | "sigterm" | "sigkill" | "quarantine">;
  contained: boolean;
  reason: string;
  hit?: DetectorHit;
}

export type KillFn = (pid: number, signal: "SIGTERM" | "SIGKILL") => void;

export const DEFAULT_ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function buildDefaultRules(
  overrides: Partial<PolicyRuleRecord>[] = [],
): PolicyRuleRecord[] {
  return DEFAULT_POLICY_RULES.map((rule) => {
    const over = overrides.find((o) => o.id === rule.id || o.kind === rule.kind);
    return over ? { ...rule, ...over } : { ...rule };
  });
}
