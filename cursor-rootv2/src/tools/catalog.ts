import type { RouterToolId } from "../router/types.js";
import {
  containStubAdapter,
  createStableDiffusionAdapter,
  holdAdapter,
  identityStubAdapter,
  localStatusAdapter,
  sandboxRehearseAdapter,
  stubTextAdapter,
} from "./adapters.js";
import { createToolAllowlist, isToolAllowed } from "./allowlist.js";
import type { ToolAdapter, ToolAllowlist, ToolResult } from "./types.js";

export class ToolCatalog {
  private readonly adapters = new Map<RouterToolId, ToolAdapter>();
  readonly allowlist: ToolAllowlist;

  constructor(options: { allowImageGen?: boolean; extraAllowed?: RouterToolId[] } = {}) {
    const extra = [...(options.extraAllowed ?? [])];
    if (options.allowImageGen) extra.push("image_gen");
    this.allowlist = createToolAllowlist(extra);

    for (const adapter of [
      stubTextAdapter,
      localStatusAdapter,
      holdAdapter,
      containStubAdapter,
      sandboxRehearseAdapter,
      identityStubAdapter,
      createStableDiffusionAdapter(Boolean(options.allowImageGen)),
    ]) {
      this.adapters.set(adapter.id, adapter);
    }
  }

  async execute(toolId: RouterToolId, text: string, args?: Record<string, unknown>): Promise<ToolResult> {
    if (!isToolAllowed(this.allowlist, toolId)) {
      return {
        ok: false,
        toolId,
        usedStub: true,
        payload: {},
        error: `Tool ${toolId} is not on the owner allowlist.`,
      };
    }
    const adapter = this.adapters.get(toolId);
    if (!adapter) {
      return {
        ok: false,
        toolId,
        usedStub: true,
        payload: {},
        error: `No adapter registered for ${toolId}.`,
      };
    }
    return adapter.execute({ text, ...(args ? { args } : {}) });
  }
}
