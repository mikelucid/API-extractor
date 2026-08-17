import type {
  AgentProfileRecord,
  IdentityRecord,
  MemoryLessonRecord,
  PolicyRuleRecord,
} from "./schemas.js";
import { DEFAULT_POLICY_RULES } from "./agent-store.js";

/** Deterministic fixture datasets for tests and sandbox rehearsal. */

export const FIXTURE_AGENTS: AgentProfileRecord[] = [
  {
    id: "agt_fixture_coder",
    name: "Local coder agent",
    argvPrefix: "node ./agents/coder.js",
    cwd: "/tmp/rootv2-fixture",
    enabled: true,
    createdAt: "2026-08-15T00:00:00.000Z",
    tags: ["dev", "allowlisted"],
  },
  {
    id: "agt_fixture_scripter",
    name: "Shell script runner",
    argvPrefix: "/usr/bin/env bash ./run.sh",
    enabled: true,
    createdAt: "2026-08-15T00:00:00.000Z",
    tags: ["shell"],
  },
];

export const FIXTURE_MEMORY: MemoryLessonRecord[] = [
  {
    id: "mem_fixture_outbound",
    at: "2026-08-15T01:00:00.000Z",
    kind: "incident_pattern",
    title: "Disallowed outbound host",
    summary: "Allowlisted agent attempted connection to blocked host; contained.",
    tags: ["outbound", "containment"],
    relatedRuleIds: ["rule_disallowed_host"],
    relatedAgentIds: ["agt_fixture_coder"],
  },
];

export const FIXTURE_IDENTITIES: IdentityRecord[] = [
  {
    id: "idn_alice",
    enrolledAt: "2026-08-15T00:00:00.000Z",
    consent: "self_enrolled",
    fields: { displayName: "Alice", labels: ["owner-friend"], notes: "Lab contact" },
    friendIds: ["idn_bob"],
  },
  {
    id: "idn_bob",
    enrolledAt: "2026-08-15T00:00:00.000Z",
    consent: "owner_added",
    fields: { displayName: "Bob", labels: ["owner-friend"] },
    friendIds: ["idn_alice"],
  },
  {
    id: "idn_carol",
    enrolledAt: "2026-08-15T00:00:00.000Z",
    consent: "owner_added",
    fields: { displayName: "Carol", labels: ["acquaintance"] },
    friendIds: [],
  },
];

export const FIXTURE_POLICY_RULES: PolicyRuleRecord[] = DEFAULT_POLICY_RULES;

export function fixtureBundle() {
  return {
    agents: FIXTURE_AGENTS,
    memory: FIXTURE_MEMORY,
    identities: FIXTURE_IDENTITIES,
    policyRules: FIXTURE_POLICY_RULES,
  };
}
