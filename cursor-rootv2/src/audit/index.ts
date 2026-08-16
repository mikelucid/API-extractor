import { appendFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { auditLogPath, auditPrettyPath } from "../paths.js";

export type AuditEventKind =
  | "constitution_decision"
  | "containment"
  | "watch_ignore"
  | "sandbox_rehearsal"
  | "identity_access"
  | "agent_registered"
  | "install"
  | "uninstall";

export interface AuditEventBase {
  id: string;
  at: string;
  kind: AuditEventKind;
  summary: string;
}

export interface ConstitutionAuditEvent extends AuditEventBase {
  kind: "constitution_decision";
  allowed: boolean;
  intent: string;
  reason: string;
}

export interface ContainmentAuditEvent extends AuditEventBase {
  kind: "containment";
  processId: string;
  processName: string;
  ruleId: string;
  action: "pause" | "sigterm" | "sigkill" | "quarantine";
  confidence: number;
}

export interface WatchIgnoreAuditEvent extends AuditEventBase {
  kind: "watch_ignore";
  processId: string;
  reason: string;
}

export interface SandboxAuditEvent extends AuditEventBase {
  kind: "sandbox_rehearsal";
  rehearsalId: string;
  outcome: "ok" | "blocked" | "error";
}

export interface IdentityAccessAuditEvent extends AuditEventBase {
  kind: "identity_access";
  requesterId: string;
  subjectId: string;
  allowed: boolean;
  /** Never include identity payload body. */
  fieldsRequested: string[];
}

export interface AgentRegisteredAuditEvent extends AuditEventBase {
  kind: "agent_registered";
  agentId: string;
  argvPrefix: string;
}

export interface InstallAuditEvent extends AuditEventBase {
  kind: "install" | "uninstall";
  platform: string;
  dryRun: boolean;
}

export type AuditEvent =
  | ConstitutionAuditEvent
  | ContainmentAuditEvent
  | WatchIgnoreAuditEvent
  | SandboxAuditEvent
  | IdentityAccessAuditEvent
  | AgentRegisteredAuditEvent
  | InstallAuditEvent;

function newId(): string {
  return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createAuditEvent<T extends Omit<AuditEvent, "id" | "at">>(
  partial: T,
): T & { id: string; at: string } {
  return {
    ...partial,
    id: newId(),
    at: new Date().toISOString(),
  };
}

export interface AuditWriterOptions {
  rootDir?: string;
  now?: () => Date;
}

export class AuditLog {
  private readonly jsonlPath: string;
  private readonly prettyPath: string;

  constructor(options: AuditWriterOptions = {}) {
    this.jsonlPath = auditLogPath(options.rootDir);
    this.prettyPath = auditPrettyPath(options.rootDir);
  }

  append(event: AuditEvent): void {
    mkdirSync(dirname(this.jsonlPath), { recursive: true });
    const line = JSON.stringify(redactAuditEvent(event));
    appendFileSync(this.jsonlPath, `${line}\n`, "utf8");
    appendFileSync(this.prettyPath, formatPretty(event) + "\n", "utf8");
  }

  readAll(): AuditEvent[] {
    if (!existsSync(this.jsonlPath)) return [];
    return readFileSync(this.jsonlPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEvent);
  }
}

/** Strip any accidental identity payload-like keys before persistence. */
export function redactAuditEvent(event: AuditEvent): AuditEvent {
  const clone = structuredClone(event) as AuditEvent & {
    payload?: unknown;
    identityBody?: unknown;
    secret?: unknown;
  };
  delete clone.payload;
  delete clone.identityBody;
  delete clone.secret;
  return clone;
}

function formatPretty(event: AuditEvent): string {
  switch (event.kind) {
    case "constitution_decision":
      return `[${event.at}] constitution ${event.allowed ? "ALLOW" : "DENY"} intent=${event.intent} — ${event.reason}`;
    case "containment":
      return `[${event.at}] contain ${event.action} process=${event.processName}(${event.processId}) rule=${event.ruleId} conf=${event.confidence.toFixed(2)} — ${event.summary}`;
    case "watch_ignore":
      return `[${event.at}] watch-ignore process=${event.processId} — ${event.reason}`;
    case "sandbox_rehearsal":
      return `[${event.at}] sandbox ${event.outcome} id=${event.rehearsalId} — ${event.summary}`;
    case "identity_access":
      return `[${event.at}] identity-access requester=${event.requesterId} subject=${event.subjectId} allowed=${event.allowed} fields=${event.fieldsRequested.join(",")}`;
    case "agent_registered":
      return `[${event.at}] agent-registered id=${event.agentId} argv=${event.argvPrefix}`;
    case "install":
    case "uninstall":
      return `[${event.at}] ${event.kind} platform=${event.platform} dryRun=${event.dryRun} — ${event.summary}`;
    default: {
      const _never: never = event;
      return `[unknown] ${JSON.stringify(_never)}`;
    }
  }
}
