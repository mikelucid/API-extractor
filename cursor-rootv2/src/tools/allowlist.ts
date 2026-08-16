import type { RouterToolId } from "../router/types.js";
import type { ToolAllowlist } from "./types.js";

const DEFAULT_ALLOWED: RouterToolId[] = [
  "local_diagnose",
  "contain_session",
  "sandbox_rehearsal",
  "owner_status",
  "identity_resolve",
  "hold",
];

export function createToolAllowlist(extra: RouterToolId[] = []): ToolAllowlist {
  return { allowedToolIds: new Set<RouterToolId>([...DEFAULT_ALLOWED, ...extra]) };
}

export function isToolAllowed(allowlist: ToolAllowlist, toolId: RouterToolId): boolean {
  return allowlist.allowedToolIds.has(toolId);
}
