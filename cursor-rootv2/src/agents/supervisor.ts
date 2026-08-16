import { evaluateConstitution, type ConstitutionRequest } from "../constitution/index.js";
import { AuditLog, createAuditEvent } from "../audit/index.js";
import { assertValidPersona, DEFAULT_PERSONA, PERSONA_PREAMBLE } from "../persona/index.js";
import { AgentDatasetStore } from "../datasets/agent-store.js";
import { MemoryDataset } from "../datasets/memory-store.js";
import { LocalRouter } from "../router/local-router.js";
import { ToolCatalog } from "../tools/catalog.js";
import { ThoughtLoop } from "../thought/index.js";
import { DEFAULT_ESCALATION, EscalationGate, type EscalationConfig } from "../escalation/index.js";
import { ProviderChain } from "../fallback/index.js";
import { AgentRegistry } from "./registry.js";
import { SessionWatcher } from "./watch.js";
import type { KillFn, ProcessSnapshot } from "./types.js";
import type { RouterToolId } from "../router/types.js";
import type { ToolResult } from "../tools/types.js";
import type { ThoughtPlan } from "../thought/index.js";

export interface SupervisorOptions {
  rootDir: string;
  killFn?: KillFn;
  audit?: AuditLog;
  escalation?: EscalationConfig;
  allowImageGen?: boolean;
}

export interface DecideResult {
  routedTool: RouterToolId;
  constitutionAllowed: boolean;
  constitutionReason: string;
  escalated: boolean;
  plan: ThoughtPlan;
  toolResult?: ToolResult;
}

/**
 * Local supervisor agent upgraded with PDF-derived decision loop:
 * LocalRouter → constitution → escalation → thought loop → tools;
 * observe path uses live ratio + quantized swing before contain.
 */
export class SupervisorAgent {
  readonly persona = DEFAULT_PERSONA;
  readonly preamble = PERSONA_PREAMBLE;
  readonly audit: AuditLog;
  readonly agents: AgentRegistry;
  readonly watcher: SessionWatcher;
  readonly memory: MemoryDataset;
  readonly router = new LocalRouter();
  readonly tools: ToolCatalog;
  readonly thoughts = new ThoughtLoop();
  readonly escalation: EscalationGate;
  readonly providers = new ProviderChain();

  constructor(options: SupervisorOptions) {
    assertValidPersona(this.persona);
    this.audit = options.audit ?? new AuditLog({ rootDir: options.rootDir });
    const store = new AgentDatasetStore(options.rootDir);
    this.agents = new AgentRegistry(store, this.audit);
    this.watcher = new SessionWatcher(this.agents, this.audit, {
      ...(options.killFn ? { killFn: options.killFn } : {}),
      escalation: options.escalation ?? DEFAULT_ESCALATION,
    });
    this.memory = new MemoryDataset(options.rootDir);
    this.tools = new ToolCatalog({ allowImageGen: options.allowImageGen ?? false });
    this.escalation = new EscalationGate(options.escalation ?? DEFAULT_ESCALATION);
  }

  gate(request: ConstitutionRequest) {
    const decision = evaluateConstitution(request);
    this.audit.append(
      createAuditEvent({
        kind: "constitution_decision",
        summary: decision.reason,
        allowed: decision.allowed,
        intent: decision.intent,
        reason: decision.reason,
      }),
    );
    return decision;
  }

  /**
   * Owner-request decision path (Router + Thought PDFs).
   * Never executes tools when constitution denies.
   */
  async decide(text: string): Promise<DecideResult> {
    const routed = this.router.route(text);
    this.audit.append(
      createAuditEvent({
        kind: "route_decision",
        summary: routed.reason,
        toolId: routed.toolId,
        confidence: routed.confidence,
      }),
    );

    const constitution = this.gate({
      text,
      intentHint: routed.intentHint,
    });

    const ratio = this.watcher.raster.snapshot();
    const thought = this.thoughts.run({
      text,
      threatSafeRatio: ratio.threatSafeRatio,
      constitutionAllowed: constitution.allowed,
    });

    if (!constitution.allowed) {
      return {
        routedTool: routed.toolId,
        constitutionAllowed: false,
        constitutionReason: constitution.reason,
        escalated: false,
        plan: thought.plan,
      };
    }

    const esc = this.escalation.evaluate({
      urgency: 1 - routed.confidence,
      proposedAction: thought.plan.action,
    });
    this.audit.append(
      createAuditEvent({
        kind: "escalation",
        summary: esc.reason,
        autoAct: esc.autoAct,
        escalateToOwner: esc.escalateToOwner,
      }),
    );

    if (esc.escalateToOwner && !esc.autoAct && thought.plan.action === "contain") {
      return {
        routedTool: routed.toolId,
        constitutionAllowed: true,
        constitutionReason: constitution.reason,
        escalated: true,
        plan: thought.plan,
      };
    }

    const toolResult = await this.tools.execute(routed.toolId, text);
    this.recordLesson({
      title: `Decision: ${routed.toolId}`,
      summary: thought.plan.reasoning,
      tags: ["decide", routed.toolId],
      rating: routed.confidence,
      decisionRatio: ratio.threatSafeRatio,
    });

    return {
      routedTool: routed.toolId,
      constitutionAllowed: true,
      constitutionReason: constitution.reason,
      escalated: esc.escalateToOwner,
      plan: thought.plan,
      toolResult,
    };
  }

  observe(snapshot: ProcessSnapshot) {
    return this.watcher.observe(snapshot);
  }

  recordLesson(input: {
    title: string;
    summary: string;
    tags: string[];
    relatedRuleIds?: string[];
    relatedAgentIds?: string[];
    sourceRehearsalId?: string;
    rating?: number;
    decisionRatio?: number;
  }) {
    return this.memory.append({
      kind: "lesson",
      title: input.title,
      summary: input.summary,
      tags: input.tags,
      relatedRuleIds: input.relatedRuleIds ?? [],
      relatedAgentIds: input.relatedAgentIds ?? [],
      ...(input.sourceRehearsalId !== undefined
        ? { sourceRehearsalId: input.sourceRehearsalId }
        : {}),
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.decisionRatio !== undefined ? { decisionRatio: input.decisionRatio } : {}),
    });
  }
}
