import { AuditLog, createAuditEvent } from "../audit/index.js";
import type { ContainmentResult, DetectorHit, KillFn, WatchedSession } from "./types.js";

export class ContainmentService {
  constructor(
    private readonly audit: AuditLog,
    private readonly killFn: KillFn = defaultKill,
  ) {}

  contain(session: WatchedSession, hit: DetectorHit): ContainmentResult {
    const actions: ContainmentResult["actions"] = [];

    try {
      this.killFn(session.pid, "SIGTERM");
      actions.push("sigterm");
    } catch {
      // escalate
    }

    try {
      this.killFn(session.pid, "SIGKILL");
      actions.push("sigkill");
    } catch {
      // process may already be gone
    }

    session.state = "quarantined";
    actions.push("quarantine");

    this.audit.append(
      createAuditEvent({
        kind: "containment",
        summary: hit.detail,
        processId: String(session.pid),
        processName: session.agent.name,
        ruleId: hit.rule.id,
        action: "quarantine",
        confidence: hit.confidence,
      }),
    );

    return {
      sessionId: session.sessionId,
      actions,
      contained: true,
      reason: hit.detail,
      hit,
    };
  }
}

function defaultKill(pid: number, signal: "SIGTERM" | "SIGKILL"): void {
  try {
    process.kill(pid, signal);
  } catch {
    // ignore missing process in production path
  }
}
