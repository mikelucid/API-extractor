import { evaluateConstitution, type ConstitutionIntentKind } from "../constitution/index.js";
import { thinkInitial } from "../thought/index.js";
import { resolveGgufPath } from "./gguf-path.js";
import { runLlamaCpp } from "./llama-runner.js";
import type { GwavFile } from "./types.js";

export interface GwavPromptOptions {
  intentHint?: ConstitutionIntentKind;
  temperature?: number;
  topP?: number;
  dataDir?: string;
  /** When false, never spawn llama.cpp (tests). */
  allowLlama?: boolean;
}

export interface GwavPromptResult {
  ok: boolean;
  usedStub: boolean;
  backend: "stub" | "llama.cpp";
  carrierHz: number;
  node: string;
  temperature: number;
  topP: number;
  costUsd: 0;
  costUsdPerMillionTokens: 0;
  tokensIn: number;
  tokensOut: number;
  ggufPath?: string;
  answer?: string;
  reason?: string;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function stubAnswer(file: GwavFile, text: string): string {
  const plan = thinkInitial({
    text: `${file.header.systemDirective}\n\nOwner: ${text}`,
    threatSafeRatio: 0.2,
    constitutionAllowed: true,
  });
  return `[${file.header.node} @ ${file.header.carrierHz}Hz] ${plan.reasoning}`;
}

/**
 * Constitution-gated prompt against a .gwav card. Uses llama.cpp when a GGUF
 * sidecar (e.g. llama2.gguf) is connected and the binary is available; otherwise stub.
 */
export function promptGwav(file: GwavFile, text: string, options: GwavPromptOptions = {}): GwavPromptResult {
  const temperature = options.temperature ?? 0.7;
  const topP = options.topP ?? 0.9;
  const gate = evaluateConstitution({
    text,
    intentHint: options.intentHint ?? "local_diagnose",
  });
  const base = {
    carrierHz: file.header.carrierHz,
    node: file.header.node,
    temperature,
    topP,
    costUsd: 0 as const,
    costUsdPerMillionTokens: 0 as const,
    tokensIn: estimateTokens(text),
    tokensOut: 0,
  };
  if (!gate.allowed) {
    return { ...base, ok: false, usedStub: true, backend: "stub", reason: gate.reason };
  }

  const allowLlama = options.allowLlama !== false;
  const dataDir = options.dataDir ?? process.env.CURSOR_ROOTV2_DATA_DIR ?? process.env.ROOTV2_DATA_DIR ?? "";
  const ggufPath = dataDir ? resolveGgufPath(file, dataDir) : file.header.sidecarGguf ?? null;

  if (allowLlama && ggufPath) {
    const llama = runLlamaCpp({
      ggufPath,
      systemDirective: file.header.systemDirective,
      userText: text,
      temperature,
      topP,
    });
    if (llama.ok && llama.answer) {
      const answer = `[${file.header.node} @ ${file.header.carrierHz}Hz · llama2] ${llama.answer}`;
      return {
        ...base,
        ok: true,
        usedStub: false,
        backend: "llama.cpp",
        ggufPath,
        tokensOut: estimateTokens(answer),
        answer,
      };
    }
  }

  const answer = stubAnswer(file, text);
  return {
    ...base,
    ok: true,
    usedStub: true,
    backend: "stub",
    ...(ggufPath ? { ggufPath } : {}),
    tokensOut: estimateTokens(answer),
    answer,
    ...(allowLlama && ggufPath ? { reason: "llama.cpp unavailable — used local stub" } : {}),
  };
}
