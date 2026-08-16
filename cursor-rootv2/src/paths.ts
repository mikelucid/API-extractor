import { homedir } from "node:os";
import { join } from "node:path";

export const APP_NAME = "CursorRootv2";
export const LAUNCH_AGENT_LABEL = "com.cursor.rootv2.supervisor";

/** User-domain Application Support path (macOS) with Linux fallback for CI. */
export function applicationSupportDir(home = homedir()): string {
  if (process.platform === "darwin") {
    return join(home, "Library", "Application Support", APP_NAME);
  }
  return join(home, ".local", "share", APP_NAME);
}

export function launchAgentsDir(home = homedir()): string {
  return join(home, "Library", "LaunchAgents");
}

export function launchAgentPlistPath(home = homedir()): string {
  return join(launchAgentsDir(home), `${LAUNCH_AGENT_LABEL}.plist`);
}

export function auditLogPath(root = applicationSupportDir()): string {
  return join(root, "audit", "supervisor.jsonl");
}

export function auditPrettyPath(root = applicationSupportDir()): string {
  return join(root, "audit", "supervisor.txt");
}

export function datasetsDir(root = applicationSupportDir()): string {
  return join(root, "datasets");
}

export function memoryDatasetPath(root = applicationSupportDir()): string {
  return join(datasetsDir(root), "memory.jsonl");
}

export function identityDatasetPath(root = applicationSupportDir()): string {
  return join(datasetsDir(root), "identity.vault.json");
}

export function agentRegistryPath(root = applicationSupportDir()): string {
  return join(datasetsDir(root), "agents.json");
}

export function sandboxWorkRoot(root = applicationSupportDir()): string {
  return join(root, "sandbox");
}
