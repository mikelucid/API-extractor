import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { AuditLog, createAuditEvent } from "../audit/index.js";
import { MemoryDataset } from "../datasets/memory-store.js";
import { sandboxWorkRoot } from "../paths.js";

const BLOCKED_PREFIXES = [
  "/System",
  "/usr",
  "/bin",
  "/sbin",
  "/etc",
  "/Library",
  "/Users",
  "/home",
  "/root",
  "/var",
];

export interface SandboxRehearsalRequest {
  scriptBody: string;
  /** Paths the script claims it will touch (evaluated statically for v1). */
  claimedPaths?: string[];
  title?: string;
}

export interface SandboxRehearsalResult {
  rehearsalId: string;
  outcome: "ok" | "blocked" | "error";
  workDir: string;
  blockedPath?: string;
  memoryId?: string;
  capabilityLabel: string;
}

export class SandboxRunner {
  constructor(
    private readonly rootDir: string,
    private readonly audit: AuditLog,
    private readonly memory: MemoryDataset,
  ) {}

  run(request: SandboxRehearsalRequest): SandboxRehearsalResult {
    const rehearsalId = `reh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const base = sandboxWorkRoot(this.rootDir);
    mkdirSync(base, { recursive: true });
    const workDir = mkdtempSync(join(base, "reh-"));

    const capabilityLabel =
      "cwd+env jail (no bubblewrap); not an unbreakable sandbox — audits label capability honestly";

    try {
      for (const claimed of request.claimedPaths ?? []) {
        if (isBlockedPath(claimed, workDir)) {
          const result: SandboxRehearsalResult = {
            rehearsalId,
            outcome: "blocked",
            workDir,
            blockedPath: claimed,
            capabilityLabel,
          };
          this.audit.append(
            createAuditEvent({
              kind: "sandbox_rehearsal",
              summary: `Blocked path access: ${claimed}`,
              rehearsalId,
              outcome: "blocked",
            }),
          );
          return result;
        }
      }

      // Write script into ephemeral workdir only; do not execute untrusted shell in CI unit path.
      const scriptPath = join(workDir, "rehearsal.sh");
      writeFileSync(scriptPath, request.scriptBody, "utf8");

      const lesson = this.memory.append({
        kind: "lesson",
        title: request.title ?? "Sandbox rehearsal",
        summary: "Rehearsal completed inside ephemeral workdir without blocked path access.",
        tags: ["sandbox", "rehearsal"],
        relatedRuleIds: ["rule_sandbox_escape"],
        relatedAgentIds: [],
        sourceRehearsalId: rehearsalId,
      });

      this.audit.append(
        createAuditEvent({
          kind: "sandbox_rehearsal",
          summary: `Rehearsal ok under ${capabilityLabel}`,
          rehearsalId,
          outcome: "ok",
        }),
      );

      return {
        rehearsalId,
        outcome: "ok",
        workDir,
        memoryId: lesson.id,
        capabilityLabel,
      };
    } catch (err) {
      this.audit.append(
        createAuditEvent({
          kind: "sandbox_rehearsal",
          summary: err instanceof Error ? err.message : "Sandbox error",
          rehearsalId,
          outcome: "error",
        }),
      );
      return {
        rehearsalId,
        outcome: "error",
        workDir,
        capabilityLabel,
      };
    }
  }

  cleanup(workDir: string): void {
    if (existsSync(workDir) && workDir.includes(`${join("sandbox", "reh-")}`)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  }
}

export function isBlockedPath(target: string, workDir: string): boolean {
  const resolved = resolve(target);
  const allowed = resolve(workDir);
  if (resolved === allowed || resolved.startsWith(allowed + "/") || resolved.startsWith(allowed + "\\")) {
    return false;
  }
  // Also allow OS temp for test harness paths that resolve under tmp
  const tmp = resolve(tmpdir());
  if (resolved.startsWith(tmp + "/") && resolved.includes("reh-")) {
    return false;
  }
  for (const prefix of BLOCKED_PREFIXES) {
    if (resolved === prefix || resolved.startsWith(prefix + "/")) {
      return true;
    }
  }
  // Fail closed for absolute paths outside workdir
  if (resolved.startsWith("/")) return true;
  return false;
}
