import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export interface LlamaRunInput {
  ggufPath: string;
  systemDirective: string;
  userText: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LlamaRunResult {
  ok: boolean;
  backend: "llama.cpp";
  answer?: string;
  reason?: string;
  exitCode?: number | undefined;
}

const BIN_CANDIDATES = ["llama-cli", "llama.cpp", "llama-server", "main"];

export function resolveLlamaCppBin(): string | null {
  const env = process.env.LLAMA_CPP_BIN?.trim();
  if (env && existsSync(env)) return env;
  for (const name of BIN_CANDIDATES) {
    const found = spawnSync("which", [name], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  return null;
}

function buildPrompt(systemDirective: string, userText: string): string {
  return `${systemDirective.trim()}\n\nOwner: ${userText.trim()}\n\nAssistant:`;
}

/**
 * Run local llama.cpp against a GGUF sidecar. Constitution must already allow the prompt.
 * Returns ok:false when the binary is missing or the run fails — caller falls back to stub.
 */
export function runLlamaCpp(input: LlamaRunInput): LlamaRunResult {
  const bin = resolveLlamaCppBin();
  if (!bin) {
    return { ok: false, backend: "llama.cpp", reason: "llama.cpp binary not found (set LLAMA_CPP_BIN or install llama-cli)" };
  }
  if (!existsSync(input.ggufPath)) {
    return { ok: false, backend: "llama.cpp", reason: `GGUF not found: ${input.ggufPath}` };
  }

  const prompt = buildPrompt(input.systemDirective, input.userText);
  const args = [
    "-m",
    input.ggufPath,
    "-p",
    prompt,
    "-n",
    String(input.maxTokens ?? 256),
    "--temp",
    String(input.temperature ?? 0.7),
    "--top-p",
    String(input.topP ?? 0.9),
    "-no-cnv",
  ];

  const timeout = input.timeoutMs ?? 120_000;
  const proc = spawnSync(bin, args, {
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });

  if (proc.error) {
    return { ok: false, backend: "llama.cpp", reason: proc.error.message, exitCode: proc.status ?? undefined };
  }
  if (proc.status !== 0) {
    const err = (proc.stderr || proc.stdout || "llama.cpp exited nonzero").trim();
    return { ok: false, backend: "llama.cpp", reason: err.slice(0, 500), exitCode: proc.status ?? undefined };
  }

  const answer = (proc.stdout || "").trim();
  if (!answer) {
    return { ok: false, backend: "llama.cpp", reason: "llama.cpp returned empty output", exitCode: proc.status ?? undefined };
  }
  return { ok: true, backend: "llama.cpp", answer };
}
