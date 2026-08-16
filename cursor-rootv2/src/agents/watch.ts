import { AuditLog, createAuditEvent } from "../audit/index.js";
import { LiveRasterizer } from "../decision/live-raster.js";
import { QuantizedSwingDecision } from "../decision/quantized-swing.js";
import type { DecisionRatio, QuantLevel } from "../decision/types.js";
import { DEFAULT_ESCALATION, EscalationGate, type EscalationConfig } from "../escalation/index.js";
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
  readonly raster = new LiveRasterizer();
  readonly swing = new QuantizedSwingDecision();
  private readonly escalation: EscalationGate;

  constructor(
    private readonly registry: AgentRegistry,
    private readonly audit: AuditLog,
    options: {
      rules?: PolicyRuleRecord[];
      killFn?: KillFn;
      escalation?: EscalationConfig;
    } = {},
  ) {
    this.rules = options.rules ?? buildDefaultRules();
    this.containment = new ContainmentService(audit, options.killFn);
    this.escalation = new EscalationGate(options.escalation ?? DEFAULT_ESCALATION);
  }

  listSessions(): WatchedSession[] {
    return [...this.sessions.values()];
  }

  getSession(sessionId: string): WatchedSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Observe a process snapshot. Non-allowlisted processes are ignored.
   * Detector hits feed the live ratio raster; quantized swing + escalation
   * gate decide whether to contain (PDF upgrade: Live Rating + Legal escalation).
   */
  observe(snapshot: ProcessSnapshot): {
    ignored: boolean;
    session?: WatchedSession;
    containment?: ContainmentResult;
    ratio?: DecisionRatio;
    swing?: QuantLevel;
    escalated?: boolean;
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
    this.raster.ingestHits(hits);
    const ratio = this.raster.snapshot();
    const swing = this.swing.decide(ratio.threatSafeRatio);

    this.audit.append(
      createAuditEvent({
        kind: "decision_ratio",
        summary: `Live ratio decision ${swing.label}`,
        threatSafeRatio: ratio.threatSafeRatio,
        action: swing.action,
        quant: swing.quant,
      }),
    );

    const top = hits[0];
    if (!top) {
      return { ignored: false, session, ratio, swing };
    }

    if (swing.action === "hold") {
      return { ignored: false, session, ratio, swing };
    }

    if (swing.action === "escalate") {
      const esc = this.escalation.evaluate({
        urgency: Math.max(top.confidence, ratio.confidence),
        proposedAction: "escalate",
      });
      this.audit.append(
        createAuditEvent({
          kind: "escalation",
          summary: esc.reason,
          autoAct: esc.autoAct,
          escalateToOwner: true,
        }),
      );
      return { ignored: false, session, ratio, swing, escalated: true };
    }

    // swing.action === contain
    const esc = this.escalation.evaluate({
      urgency: Math.max(top.confidence, ratio.confidence),
      proposedAction: "contain",
    });
    this.audit.append(
      createAuditEvent({
        kind: "escalation",
        summary: esc.reason,
        autoAct: esc.autoAct,
        escalateToOwner: esc.escalateToOwner,
      }),
    );

    if (!esc.autoAct) {
      return { ignored: false, session, ratio, swing, escalated: true };
    }

    const containment = this.containment.contain(session, top);
    return { ignored: false, session, containment, ratio, swing };
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
