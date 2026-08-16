import { AuditLog, createAuditEvent } from "../audit/index.js";
import { AgentDatasetStore } from "../datasets/agent-store.js";
import type { AgentProfileRecord } from "../datasets/schemas.js";

export class AgentRegistry {
  constructor(
    private readonly store: AgentDatasetStore,
    private readonly audit?: AuditLog,
  ) {}

  list(): AgentProfileRecord[] {
    return this.store.list();
  }

  register(input: {
    name: string;
    argvPrefix: string;
    cwd?: string;
    socketPath?: string;
    tags?: string[];
  }): AgentProfileRecord {
    const agent = this.store.register(input);
    this.audit?.append(
      createAuditEvent({
        kind: "agent_registered",
        summary: `Registered allowlisted agent ${agent.name}`,
        agentId: agent.id,
        argvPrefix: agent.argvPrefix,
      }),
    );
    return agent;
  }

  resolveAllowlisted(argv: string[], cwd?: string): AgentProfileRecord | undefined {
    return this.store.isAllowlisted(argv, cwd);
  }
}
