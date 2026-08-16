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
}

/**
 * Institutional rehearsal loop: invent/run self-prompts through decide().
 * Alias CLI name may be "bored" — persona still frames this as rehearsal, not boredom-drive.
 */
export async function runIdleRehearsal(options: {
  rootDir: string;
  count?: number;
  withThink?: boolean;
}): Promise<IdleRehearsalReport> {
  const count = options.count ?? 5;
  const supervisor = new SupervisorAgent({ rootDir: options.rootDir });
  const prompts = pickRehearsalBatch(count, true);
  // Sprinkle one freshly invented prompt at the end for variety.
  prompts.push(inventSelfPrompt(Date.now() + 99));

  const lines: string[] = [
    "cursor-rootv2 · institutional rehearsal (self-prompts)",
    "framing: scheduled curiosity drills — not boredom-drive (persona forbids that)",
    "",
  ];

  const results: RehearsalResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const prompt of prompts.slice(0, count)) {
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

    lines.push(`• [${prompt.kind}] ${prompt.text}`);
    lines.push(`  ${result.ok ? "ok" : "FAIL"} — ${result.note}`);
    if (decision.plan?.mathTrace?.length) {
      lines.push(`  math: ${decision.plan.mathTrace.at(-1)}`);
    }
    lines.push("");
  }

  if (options.withThink) {
    lines.push("── bonus think drift ──");
    const demo = runThinkDemo({ scenario: "drift", steps: 3 });
    lines.push(...demo.lines.slice(-8));
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
    summary: `Rehearsed ${results.length} self-prompts (${passed} ok, ${failed} fail)`,
    tags: ["rehearsal", "self-prompt"],
    rating: failed === 0 ? 0.95 : 0.5,
  });

  lines.push(`summary: ${passed} ok / ${failed} fail of ${results.length}`);
  return {
    framing: "institutional_rehearsal",
    results,
    passed,
    failed,
    lines,
  };
}
