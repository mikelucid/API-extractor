import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { agentRegistryPath } from "../paths.js";
import {
  datasetMeta,
  newAgentId,
  type AgentProfileRecord,
  type AgentRegistryDataset,
  type PolicyRuleRecord,
  type PolicyRulesDataset,
} from "./schemas.js";

export class AgentDatasetStore {
  private readonly path: string;
  private agents: AgentProfileRecord[] = [];

  constructor(rootDir?: string) {
    this.path = agentRegistryPath(rootDir);
    this.load();
  }

  private load(): void {
    if (!existsSync(this.path)) {
      this.agents = [];
      return;
    }
    const parsed = JSON.parse(readFileSync(this.path, "utf8")) as AgentRegistryDataset;
    this.agents = parsed.agents;
  }

  private persist(): void {
    const payload: AgentRegistryDataset = {
      meta: datasetMeta("agents"),
      agents: this.agents,
    };
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(payload, null, 2), "utf8");
  }

  list(): AgentProfileRecord[] {
    return [...this.agents];
  }

  get(id: string): AgentProfileRecord | undefined {
    return this.agents.find((a) => a.id === id);
  }

  register(input: {
    id?: string;
    name: string;
    argvPrefix: string;
    cwd?: string;
    socketPath?: string;
    tags?: string[];
    enabled?: boolean;
  }): AgentProfileRecord {
    const record: AgentProfileRecord = {
      id: input.id ?? newAgentId(),
      name: input.name,
      argvPrefix: input.argvPrefix,
      enabled: input.enabled ?? true,
      createdAt: new Date().toISOString(),
      tags: input.tags ?? [],
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
      ...(input.socketPath !== undefined ? { socketPath: input.socketPath } : {}),
    };
    this.agents.push(record);
    this.persist();
    return record;
  }

  isAllowlisted(argv: string[], cwd?: string): AgentProfileRecord | undefined {
    const joined = argv.join(" ");
    return this.agents.find((agent) => {
      if (!agent.enabled) return false;
      if (!joined.startsWith(agent.argvPrefix) && argv[0] !== agent.argvPrefix) {
        return false;
      }
      if (agent.cwd && cwd && agent.cwd !== cwd) return false;
      return true;
    });
  }

  disable(id: string): void {
    const agent = this.get(id);
    if (!agent) throw new Error(`Unknown agent ${id}`);
    agent.enabled = false;
    this.persist();
  }
}

export const DEFAULT_POLICY_RULES: PolicyRuleRecord[] = [
  {
    id: "rule_disallowed_host",
    name: "Disallowed outbound host",
    kind: "disallowed_host",
    enabled: true,
    confidenceThreshold: 0.8,
    pattern: "",
  },
  {
    id: "rule_runaway_spawn",
    name: "Runaway child spawn count",
    kind: "runaway_spawn",
    enabled: true,
    confidenceThreshold: 0.75,
    maxSpawns: 25,
  },
  {
    id: "rule_constitution_breach",
    name: "Constitution breach in session",
    kind: "constitution_breach",
    enabled: true,
    confidenceThreshold: 0.7,
  },
  {
    id: "rule_sandbox_escape",
    name: "Sandbox escape attempt",
    kind: "sandbox_escape",
    enabled: true,
    confidenceThreshold: 0.85,
  },
];

export function createPolicyRulesDataset(
  rules: PolicyRuleRecord[] = DEFAULT_POLICY_RULES,
): PolicyRulesDataset {
  return { meta: datasetMeta("policy_rules"), rules };
}
