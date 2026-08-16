import { evaluateConstitution, type ConstitutionRequest } from "../constitution/index.js";
import { AuditLog, createAuditEvent } from "../audit/index.js";
import { assertValidPersona, DEFAULT_PERSONA, PERSONA_PREAMBLE } from "../persona/index.js";
import { AgentDatasetStore } from "../datasets/agent-store.js";
import { MemoryDataset } from "../datasets/memory-store.js";
import { AgentRegistry } from "./registry.js";
import { SessionWatcher } from "./watch.js";
import type { KillFn, ProcessSnapshot } from "./types.js";

export interface SupervisorOptions {
  rootDir: string;
  killFn?: KillFn;
  audit?: AuditLog;
}

/**
 * Local supervisor agent: constitution gate + allowlisted session watch + memory.
 */
export class SupervisorAgent {
  readonly persona = DEFAULT_PERSONA;
  readonly preamble = PERSONA_PREAMBLE;
  readonly audit: AuditLog;
  readonly agents: AgentRegistry;
  readonly watcher: SessionWatcher;
  readonly memory: MemoryDataset;

  constructor(options: SupervisorOptions) {
    assertValidPersona(this.persona);
    this.audit = options.audit ?? new AuditLog({ rootDir: options.rootDir });
    const store = new AgentDatasetStore(options.rootDir);
    this.agents = new AgentRegistry(store, this.audit);
    this.watcher = new SessionWatcher(this.agents, this.audit, {
      ...(options.killFn ? { killFn: options.killFn } : {}),
    });
    this.memory = new MemoryDataset(options.rootDir);
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
    });
  }
}
