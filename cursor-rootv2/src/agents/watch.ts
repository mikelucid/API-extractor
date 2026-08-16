import { AuditLog, createAuditEvent } from "../audit/index.js";
import type { PolicyRuleRecord } from "../datasets/schemas.js";
import { detectThreats } from "./detect.js";
import { ContainmentService } from "./contain.js";
import { AgentRegistry } from "./registry.js";
import {
  buildDefaultRules,
  type ContainmentResult,
  type KillFn,
  type ProcessSnapshot,
  type WatchedSession,
} from "./types.js";

export class SessionWatcher {
  private readonly sessions = new Map<string, WatchedSession>();
  private readonly rules: PolicyRuleRecord[];
  private readonly containment: ContainmentService;

  constructor(
    private readonly registry: AgentRegistry,
    private readonly audit: AuditLog,
    options: { rules?: PolicyRuleRecord[]; killFn?: KillFn } = {},
  ) {
    this.rules = options.rules ?? buildDefaultRules();
    this.containment = new ContainmentService(audit, options.killFn);
  }

  listSessions(): WatchedSession[] {
    return [...this.sessions.values()];
  }

  getSession(sessionId: string): WatchedSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Observe a process snapshot. Non-allowlisted processes are ignored.
   * On detector hit above threshold, contain immediately.
   */
  observe(snapshot: ProcessSnapshot): {
    ignored: boolean;
    session?: WatchedSession;
    containment?: ContainmentResult;
  } {
    const agent = this.registry.resolveAllowlisted(snapshot.argv, snapshot.cwd);
    if (!agent) {
      this.audit.append(
        createAuditEvent({
          kind: "watch_ignore",
          summary: "Non-allowlisted process ignored",
          processId: String(snapshot.pid),
          reason: "Not on agent allowlist",
        }),
      );
      return { ignored: true };
    }

    const sessionId = `sess_${snapshot.pid}_${agent.id}`;
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        agent,
        pid: snapshot.pid,
        argv: snapshot.argv,
        state: "watching",
        spawnCount: snapshot.spawnCount ?? 0,
        observedHosts: [...(snapshot.outboundHosts ?? [])],
        lastEventAt: new Date().toISOString(),
        ...(snapshot.cwd !== undefined ? { cwd: snapshot.cwd } : {}),
      };
      this.sessions.set(sessionId, session);
    } else {
      session.spawnCount = snapshot.spawnCount ?? session.spawnCount;
      session.observedHosts = unique([
        ...session.observedHosts,
        ...(snapshot.outboundHosts ?? []),
      ]);
      session.lastEventAt = new Date().toISOString();
    }

    if (session.state === "quarantined" || session.state === "stopped") {
      return { ignored: false, session };
    }

    const hits = detectThreats(session, snapshot, this.rules);
    const top = hits[0];
    if (!top) {
      return { ignored: false, session };
    }

    const containment = this.containment.contain(session, top);
    return { ignored: false, session, containment };
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
