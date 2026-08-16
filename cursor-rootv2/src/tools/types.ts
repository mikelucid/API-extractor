import type { RouterToolId } from "../router/types.js";

export interface ToolResult {
  ok: boolean;
  toolId: RouterToolId;
  payload: Record<string, unknown>;
  usedStub: boolean;
  error?: string;
}

export interface ToolAdapter {
  id: RouterToolId;
  execute(input: { text: string; args?: Record<string, unknown> }): Promise<ToolResult> | ToolResult;
}

export interface ToolAllowlist {
  allowedToolIds: ReadonlySet<RouterToolId>;
}
