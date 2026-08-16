/** Shared dataset record shapes for Rootv2 structured stores. */

export type DatasetKind = "agents" | "memory" | "identity" | "policy_rules";

export interface DatasetMeta {
  kind: DatasetKind;
  version: string;
  updatedAt: string;
}

export interface MemoryLessonRecord {
  id: string;
  at: string;
  kind: "lesson" | "incident_pattern";
  title: string;
  summary: string;
  /** Structured tags only — never raw secrets or identity bodies. */
  tags: string[];
  relatedRuleIds: string[];
  relatedAgentIds: string[];
  sourceRehearsalId?: string;
}

export interface IdentityProfileFields {
  displayName: string;
  notes?: string;
  /** Owner-curated labels only; no biometric/scrape payloads. */
  labels: string[];
}

export interface IdentityRecord {
  id: string;
  enrolledAt: string;
  consent: "owner_added" | "self_enrolled";
  fields: IdentityProfileFields;
  friendIds: string[];
}

export interface IdentityVaultDataset {
  meta: DatasetMeta;
  /** AES-GCM ciphertext of JSON IdentityRecord[] when sealed; plaintext in-memory only. */
  records: IdentityRecord[];
}

export interface AgentProfileRecord {
  id: string;
  name: string;
  /** argv prefix or executable path identity for allowlisting. */
  argvPrefix: string;
  cwd?: string;
  socketPath?: string;
  enabled: boolean;
  createdAt: string;
  tags: string[];
}

export interface AgentRegistryDataset {
  meta: DatasetMeta;
  agents: AgentProfileRecord[];
}

export interface PolicyRuleRecord {
  id: string;
  name: string;
  kind: "disallowed_host" | "runaway_spawn" | "constitution_breach" | "sandbox_escape";
  enabled: boolean;
  /** Confidence threshold (0..1) required to contain. */
  confidenceThreshold: number;
  pattern?: string;
  maxSpawns?: number;
}

export interface PolicyRulesDataset {
  meta: DatasetMeta;
  rules: PolicyRuleRecord[];
}

export function datasetMeta(kind: DatasetKind, version = "1.0.0"): DatasetMeta {
  return { kind, version, updatedAt: new Date().toISOString() };
}

export function newMemoryId(): string {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newAgentId(): string {
  return `agt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newIdentityId(): string {
  return `idn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
