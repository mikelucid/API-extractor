import { evaluateConstitution, type ConstitutionIntentKind } from "../constitution/index.js";
import { thinkInitial } from "../thought/index.js";
import type { GwavFile } from "./types.js";

export interface GwavPromptOptions {
  intentHint?: ConstitutionIntentKind;
  temperature?: number;
  topP?: number;
}

export interface GwavPromptResult {
  ok: boolean;
  usedStub: true;
  carrierHz: number;
  node: string;
  temperature: number;
  topP: number;
  costUsd: 0;
  costUsdPerMillionTokens: 0;
  tokensIn: number;
  tokensOut: number;
  answer?: string;
  reason?: string;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Local prompt against a .gwav card. No cloud LLM. Uses the card directive +
 * heuristic thought loop. Real GGUF execution is out of process (optional later).
 * Default intent is local_diagnose (playground); deny patterns still fail closed.
 */
export function promptGwav(file: GwavFile, text: string, options: GwavPromptOptions = {}): GwavPromptResult {
  const temperature = options.temperature ?? 0.7;
  const topP = options.topP ?? 0.9;
  const gate = evaluateConstitution({
    text,
    intentHint: options.intentHint ?? "local_diagnose",
  });
  const base = {
    usedStub: true as const,
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
    return { ...base, ok: false, reason: gate.reason };
  }
  const plan = thinkInitial({
    text: `${file.header.systemDirective}\n\nOwner: ${text}`,
    threatSafeRatio: 0.2,
    constitutionAllowed: true,
  });
  const answer = `[${file.header.node} @ ${file.header.carrierHz}Hz] ${plan.reasoning}`;
  return {
    ...base,
    ok: true,
    tokensOut: estimateTokens(answer),
    answer,
  };
}
