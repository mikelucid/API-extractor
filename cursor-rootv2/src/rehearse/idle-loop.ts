import { SupervisorAgent } from "../agents/supervisor.js";
import { runThinkDemo } from "../demo/think-demo.js";
import { inventSelfPrompt, pickRehearsalBatch, type SelfPrompt } from "./self-prompts.js";

export interface RehearsalResult {
  prompt: SelfPrompt;
  constitutionAllowed: boolean;
  routedTool?: string;
  planAction?: string;
  mathRatio?: number;
  ok: boolean;
  note: string;
}

export interface IdleRehearsalReport {
  framing: string;
  results: RehearsalResult[];
  passed: number;
  failed: number;
  lines: string[];
  paceMs: number;
}

const DEFAULT_PACE_MS = 1200;

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Institutional rehearsal loop: invent/run self-prompts through decide().
 * Default pace is slow and deliberate — one prompt at a time with a pause.
 * Alias CLI "bored" is still framed as rehearsal, not boredom-drive.
 */
export async function runIdleRehearsal(options: {
  rootDir: string;
  count?: number;
  withThink?: boolean;
  /** Milliseconds between self-prompts. Default 1200; use 0 in tests. */
  paceMs?: number;
  /** Stream lines as they happen (for slow CLI viewing). */
  onLine?: (line: string) => void;
}): Promise<IdleRehearsalReport> {
  const count = options.count ?? 5;
  const paceMs = options.paceMs ?? DEFAULT_PACE_MS;
  const emit = (line: string, lines: string[]) => {
    lines.push(line);
    options.onLine?.(line);
  };

  const supervisor = new SupervisorAgent({ rootDir: options.rootDir });
  const prompts = pickRehearsalBatch(count, true);
  prompts.push(inventSelfPrompt(Date.now() + 99));

  const lines: string[] = [];
  emit("agent · institutional rehearsal (self-prompts)", lines);
  emit("framing: scheduled curiosity drills — not boredom-drive", lines);
  emit(`pace: ${paceMs}ms between prompts (deliberate, not rushed)`, lines);
  emit("", lines);

  const results: RehearsalResult[] = [];
  let passed = 0;
  let failed = 0;
  const batch = prompts.slice(0, count);

  for (let i = 0; i < batch.length; i++) {
    const prompt = batch[i]!;
    emit(`… sitting with prompt ${i + 1}/${batch.length}`, lines);
    await sleep(paceMs);

    const decision = await supervisor.decide(prompt.text);
    const expectOk = decision.constitutionAllowed === prompt.expectAllowed;
    const result: RehearsalResult = {
      prompt,
      constitutionAllowed: decision.constitutionAllowed,
      ...(decision.routedTool ? { routedTool: decision.routedTool } : {}),
      ...(decision.plan?.action ? { planAction: decision.plan.action } : {}),
      ...(typeof decision.plan?.risk === "number"
        ? { mathRatio: decision.plan.risk }
        : {}),
      ok: expectOk,
      note: expectOk
        ? decision.constitutionAllowed
          ? `allowed → ${decision.routedTool} / ${decision.plan.action}`
          : "correctly denied"
        : `expected allow=${prompt.expectAllowed} got ${decision.constitutionAllowed}`,
    };
    results.push(result);
    if (result.ok) passed += 1;
    else failed += 1;

    emit(`• [${prompt.kind}] ${prompt.text}`, lines);
    emit(`  ${result.ok ? "ok" : "FAIL"} — ${result.note}`, lines);
    if (decision.plan?.mathTrace?.length) {
      emit(`  math: ${decision.plan.mathTrace.at(-1)}`, lines);
    }
    emit("", lines);
  }

  if (options.withThink) {
    emit("── bonus think drift (slow steps) ──", lines);
    await sleep(paceMs);
    const demo = await runThinkDemo({
      scenario: "drift",
      steps: 3,
      paceMs,
      onLine: (line) => emit(line, lines),
    });
    supervisor.recordLesson({
      title: "rehearsal:think-bonus",
      summary: `Bonus think chose ${demo.finalAction}`,
      tags: ["rehearsal", "think"],
      rating: 0.85,
      decisionRatio: demo.finalRatio,
    });
  }

  supervisor.recordLesson({
    title: "rehearsal:self-prompts",
    summary: `Rehearsed ${results.length} self-prompts at ${paceMs}ms pace (${passed} ok, ${failed} fail)`,
    tags: ["rehearsal", "self-prompt", "slow"],
    rating: failed === 0 ? 0.95 : 0.5,
  });

  emit(`summary: ${passed} ok / ${failed} fail of ${results.length}`, lines);
  return {
    framing: "institutional_rehearsal",
    results,
    passed,
    failed,
    lines,
    paceMs,
  };
}
