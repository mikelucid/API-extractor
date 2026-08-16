import type { PolicyRuleRecord } from "../datasets/schemas.js";
import {
  DEFAULT_ALLOWED_HOSTS,
  type DetectorHit,
  type ProcessSnapshot,
  type WatchedSession,
} from "./types.js";

export function detectThreats(
  session: WatchedSession,
  snapshot: ProcessSnapshot,
  rules: PolicyRuleRecord[],
  allowedHosts: Set<string> = DEFAULT_ALLOWED_HOSTS,
): DetectorHit[] {
  const hits: DetectorHit[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    switch (rule.kind) {
      case "disallowed_host": {
        const hosts = snapshot.outboundHosts ?? session.observedHosts;
        const bad = hosts.find((h) => !allowedHosts.has(normalizeHost(h)));
        if (bad) {
          const confidence = 0.95;
          if (confidence >= rule.confidenceThreshold) {
            hits.push({
              rule,
              confidence,
              detail: `Disallowed outbound host: ${bad}`,
            });
          }
        }
        break;
      }
      case "runaway_spawn": {
        const count = snapshot.spawnCount ?? session.spawnCount;
        const max = rule.maxSpawns ?? 25;
        if (count > max) {
          const over = (count - max) / max;
          const confidence = Math.min(0.99, 0.7 + over);
          if (confidence >= rule.confidenceThreshold) {
            hits.push({
              rule,
              confidence,
              detail: `Spawn count ${count} exceeds max ${max}`,
            });
          }
        }
        break;
      }
      case "constitution_breach": {
        if (snapshot.constitutionBreach) {
          const confidence = 0.9;
          if (confidence >= rule.confidenceThreshold) {
            hits.push({
              rule,
              confidence,
              detail: "Session emitted a constitution-breach signal",
            });
          }
        }
        break;
      }
      case "sandbox_escape": {
        if (snapshot.sandboxEscapeAttempt) {
          const confidence = 0.92;
          if (confidence >= rule.confidenceThreshold) {
            hits.push({
              rule,
              confidence,
              detail: "Sandbox escape attempt observed",
            });
          }
        }
        break;
      }
      default: {
        const _never: never = rule.kind;
        void _never;
        break;
      }
    }
  }

  return hits.sort((a, b) => b.confidence - a.confidence);
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

/** Evaluate a single observation that may be below threshold (no contain). */
export function scoreDisallowedHost(
  host: string,
  rule: PolicyRuleRecord,
  allowedHosts: Set<string> = DEFAULT_ALLOWED_HOSTS,
): DetectorHit | undefined {
  if (allowedHosts.has(normalizeHost(host))) return undefined;
  const confidence = 0.95;
  if (confidence < rule.confidenceThreshold) return undefined;
  return { rule, confidence, detail: `Disallowed outbound host: ${host}` };
}
