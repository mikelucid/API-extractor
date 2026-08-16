import type { ToolAdapter, ToolResult } from "./types.js";

export const stubTextAdapter: ToolAdapter = {
  id: "local_diagnose",
  execute({ text }) {
    const result: ToolResult = {
      ok: true,
      toolId: "local_diagnose",
      usedStub: true,
      payload: {
        summary: "Local diagnose stub — no cloud LLM.",
        request: text,
        findings: [],
      },
    };
    return result;
  },
};

export const localStatusAdapter: ToolAdapter = {
  id: "owner_status",
  execute() {
    return {
      ok: true,
      toolId: "owner_status",
      usedStub: true,
      payload: { status: "ok", mode: "local" },
    };
  },
};

export const holdAdapter: ToolAdapter = {
  id: "hold",
  execute() {
    return {
      ok: true,
      toolId: "hold",
      usedStub: true,
      payload: { action: "hold" },
    };
  },
};

export const containStubAdapter: ToolAdapter = {
  id: "contain_session",
  execute({ args }) {
    return {
      ok: true,
      toolId: "contain_session",
      usedStub: true,
      payload: {
        planned: true,
        sessionId: args?.["sessionId"] ?? null,
        note: "Containment is executed via SessionWatcher/ContainmentService, not this stub.",
      },
    };
  },
};

export const sandboxRehearseAdapter: ToolAdapter = {
  id: "sandbox_rehearsal",
  execute({ text }) {
    return {
      ok: true,
      toolId: "sandbox_rehearsal",
      usedStub: true,
      payload: { plannedScript: text, note: "Use SandboxRunner for real rehearsal." },
    };
  },
};

export const identityStubAdapter: ToolAdapter = {
  id: "identity_resolve",
  execute() {
    return {
      ok: true,
      toolId: "identity_resolve",
      usedStub: true,
      payload: { note: "Use IdentityVault.resolve for ACL-gated fields." },
    };
  },
};

/** Optional SD adapter — stub by default; never on core safety path. */
export function createStableDiffusionAdapter(enabled: boolean): ToolAdapter {
  return {
    id: "image_gen",
    execute({ text }) {
      if (!enabled) {
        return {
          ok: false,
          toolId: "image_gen",
          usedStub: true,
          payload: {},
          error: "Stable Diffusion adapter disabled (optional tool).",
        };
      }
      return {
        ok: true,
        toolId: "image_gen",
        usedStub: true,
        payload: {
          prompt: text,
          imagePath: null,
          note: "Stub only — no model weights loaded.",
        },
      };
    },
  };
}
