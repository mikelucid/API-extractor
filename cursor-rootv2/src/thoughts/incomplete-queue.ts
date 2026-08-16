/**
 * Incomplete thoughts must always finish.
 *
 * When a new prompt arrives mid-thought, park the open thought here.
 * The next session (or `complete`) drains the queue, finishes each thought,
 * and stitches results back into the prior conversation record.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { datasetsDir } from "../paths.js";
import { runCreativeReversalSession } from "../art/creative-reversal.js";
import { runThinkDemo } from "../demo/think-demo.js";
import { inventSelfPrompt } from "../rehearse/self-prompts.js";
import { SupervisorAgent } from "../agents/supervisor.js";

export type ThoughtKind = "muse" | "think" | "rehearse" | "decide" | "free";

export interface IncompleteThought {
  id: string;
  kind: ThoughtKind;
  startedAt: string;
  /** Partial text / intent captured when interrupted. */
  seed: string;
  priorConversationId: string;
  status: "incomplete" | "completing" | "completed";
  progressNote?: string;
  /** Steps already done before interrupt. */
  partialLines?: string[];
}

export interface CompletedStitch {
  thoughtId: string;
  priorConversationId: string;
  completedAt: string;
  kind: ThoughtKind;
  summary: string;
  lines: string[];
}

export class IncompleteThoughtQueue {
  private readonly queuePath: string;
  private readonly stitchPath: string;

  constructor(rootDir?: string) {
    const base = rootDir ? datasetsDir(rootDir) : datasetsDir();
    this.queuePath = join(base, "incomplete-thoughts.json");
    this.stitchPath = join(base, "prior-conversation-stitches.jsonl");
  }

  /** Park an incomplete thought when a new user message arrives. */
  park(input: {
    kind: ThoughtKind;
    seed: string;
    priorConversationId?: string;
    progressNote?: string;
    partialLines?: string[];
  }): IncompleteThought {
    const thought: IncompleteThought = {
      id: `th_${randomUUID().slice(0, 8)}`,
      kind: input.kind,
      startedAt: new Date().toISOString(),
      seed: input.seed,
      priorConversationId: input.priorConversationId ?? `conv_${Date.now().toString(36)}`,
      status: "incomplete",
      ...(input.progressNote ? { progressNote: input.progressNote } : {}),
      ...(input.partialLines ? { partialLines: input.partialLines } : {}),
    };
    const all = this.list();
    all.push(thought);
    this.save(all);
    return thought;
  }

  list(): IncompleteThought[] {
    if (!existsSync(this.queuePath)) return [];
    return JSON.parse(readFileSync(this.queuePath, "utf8")) as IncompleteThought[];
  }

  pending(): IncompleteThought[] {
    return this.list().filter((t) => t.status === "incomplete");
  }

  private save(all: IncompleteThought[]): void {
    mkdirSync(dirname(this.queuePath), { recursive: true });
    writeFileSync(this.queuePath, JSON.stringify(all, null, 2), "utf8");
  }

  private stitch(entry: CompletedStitch): void {
    mkdirSync(dirname(this.stitchPath), { recursive: true });
    appendFileSync(this.stitchPath, `${JSON.stringify(entry)}\n`, "utf8");
  }

  readStitches(): CompletedStitch[] {
    if (!existsSync(this.stitchPath)) return [];
    return readFileSync(this.stitchPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CompletedStitch);
  }

  /**
   * Always complete every pending thought, then append stitches into the
   * prior conversation log so nothing is lost when the user typed something new.
   */
  async completeAll(options: {
    rootDir: string;
    paceMs?: number;
    onLine?: (line: string) => void;
  }): Promise<{ completed: CompletedStitch[]; lines: string[] }> {
    const pending = this.pending();
    const lines: string[] = [];
    const emit = (line: string) => {
      lines.push(line);
      options.onLine?.(line);
    };

    if (pending.length === 0) {
      emit("no incomplete thoughts — queue clear");
      return { completed: [], lines };
    }

    emit(`completing ${pending.length} interrupted thought(s) before continuing…`);
    const completed: CompletedStitch[] = [];
    const all = this.list();

    for (const thought of pending) {
      emit(`\n↻ resume [${thought.kind}] ${thought.id}: ${thought.seed}`);
      const idx = all.findIndex((t) => t.id === thought.id);
      if (idx >= 0) all[idx] = { ...thought, status: "completing" };
      this.save(all);

      const result = await finishThought(thought, options.rootDir, options.paceMs ?? 0, emit);
      const stitch: CompletedStitch = {
        thoughtId: thought.id,
        priorConversationId: thought.priorConversationId,
        completedAt: new Date().toISOString(),
        kind: thought.kind,
        summary: result.summary,
        lines: result.lines,
      };
      this.stitch(stitch);
      completed.push(stitch);

      if (idx >= 0) {
        all[idx] = {
          ...thought,
          status: "completed",
          progressNote: result.summary,
        };
      }
      this.save(all);
      emit(`✓ stitched back into prior conversation ${thought.priorConversationId}`);
    }

    // Drop completed from active queue file (keep stitches forever).
    this.save(all.filter((t) => t.status === "incomplete"));
    emit(`\nqueue drained — ${completed.length} thought(s) returned to prior conversation`);
    return { completed, lines };
  }
}

async function finishThought(
  thought: IncompleteThought,
  rootDir: string,
  paceMs: number,
  emit: (line: string) => void,
): Promise<{ summary: string; lines: string[] }> {
  const out: string[] = [...(thought.partialLines ?? [])];
  const note = (line: string) => {
    out.push(line);
    emit(line);
  };

  switch (thought.kind) {
    case "muse": {
      const session = await runCreativeReversalSession({
        rootDir,
        steps: 3,
        paceMs,
        onLine: note,
      });
      return {
        summary: `Completed muse (${session.records.length} reversals) from seed: ${thought.seed}`,
        lines: out,
      };
    }
    case "think": {
      const demo = await runThinkDemo({
        scenario: "drift",
        steps: 3,
        paceMs,
        onLine: note,
      });
      return {
        summary: `Completed think → ${demo.finalAction} R=${demo.finalRatio.toFixed(3)} · ${thought.seed}`,
        lines: out,
      };
    }
    case "rehearse":
    case "decide":
    case "free": {
      const supervisor = new SupervisorAgent({ rootDir });
      const prompt = thought.seed.trim() || inventSelfPrompt(Date.now()).text;
      note(`finishing decide: ${prompt}`);
      const decision = await supervisor.decide(prompt);
      note(
        decision.constitutionAllowed
          ? `allowed → ${decision.routedTool} / ${decision.plan.action}`
          : `denied → ${decision.constitutionReason}`,
      );
      if (decision.plan.mathTrace?.length) {
        note(`math: ${decision.plan.mathTrace.at(-1)}`);
      }
      supervisor.recordLesson({
        title: `complete-interrupted:${thought.kind}`,
        summary: `Finished interrupted thought ${thought.id}`,
        tags: ["incomplete-complete", thought.kind],
        rating: 0.9,
      });
      return {
        summary: `Completed ${thought.kind} decide for: ${prompt}`,
        lines: out,
      };
    }
    default: {
      const _never: never = thought.kind;
      void _never;
      return { summary: "unknown kind", lines: out };
    }
  }
}

/**
 * Call at the start of any new user turn: finish leftovers, then proceed.
 */
export async function completeThenContinue(options: {
  rootDir: string;
  newSeed: string;
  newKind?: ThoughtKind;
  parkCurrent?: boolean;
  paceMs?: number;
  onLine?: (line: string) => void;
}): Promise<{
  queue: IncompleteThoughtQueue;
  completed: CompletedStitch[];
  parked?: IncompleteThought;
}> {
  const queue = new IncompleteThoughtQueue(options.rootDir);
  const { completed } = await queue.completeAll({
    rootDir: options.rootDir,
    paceMs: options.paceMs ?? 0,
    ...(options.onLine ? { onLine: options.onLine } : {}),
  });

  let parked: IncompleteThought | undefined;
  if (options.parkCurrent && options.newSeed) {
    // If something was mid-flight when user typed anew, park the *new* open intent
    // only when explicitly requested; default path completes old ones first.
    parked = queue.park({
      kind: options.newKind ?? "free",
      seed: options.newSeed,
      progressNote: "parked after draining prior incomplete thoughts",
    });
  }

  return { queue, completed, ...(parked ? { parked } : {}) };
}
