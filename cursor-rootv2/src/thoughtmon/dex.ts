/**
 * ThoughtmonDex — catch, party, train, evolve, spar.
 * Creativity + training layer over parked/completed thoughts.
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
import {
  MathematicalThinkingAI,
  type MathFeatures,
} from "../decision/math-thinking.js";
import { runCreativeReversalSession } from "../art/creative-reversal.js";
import { runThinkDemo } from "../demo/think-demo.js";
import type { ThoughtKind } from "../thoughts/incomplete-queue.js";
import {
  inventNickname,
  speciesForKind,
  STARTER_MOVES,
  typeGlyph,
} from "./species.js";
import type {
  SparResult,
  Thoughtmon,
  ThoughtmonStage,
  TrainingResult,
} from "./types.js";

const PARTY_CAP = 6;
const XP_PER_LEVEL = 40;

export type GymId = "atelier" | "observatory" | "drill-yard" | "gatehouse" | "wilds";

export interface DexState {
  party: Thoughtmon[];
  box: Thoughtmon[];
  seenSpecies: string[];
}

export class ThoughtmonDex {
  private readonly statePath: string;
  private readonly logPath: string;

  constructor(rootDir?: string) {
    const base = rootDir ? datasetsDir(rootDir) : datasetsDir();
    this.statePath = join(base, "thoughtmon-dex.json");
    this.logPath = join(base, "thoughtmon-training.jsonl");
  }

  load(): DexState {
    if (!existsSync(this.statePath)) {
      return { party: [], box: [], seenSpecies: [] };
    }
    return JSON.parse(readFileSync(this.statePath, "utf8")) as DexState;
  }

  private save(state: DexState): void {
    mkdirSync(dirname(this.statePath), { recursive: true });
    writeFileSync(this.statePath, JSON.stringify(state, null, 2), "utf8");
  }

  private appendLog(entry: Record<string, unknown>): void {
    mkdirSync(dirname(this.logPath), { recursive: true });
    appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`, "utf8");
  }

  listAll(): Thoughtmon[] {
    const s = this.load();
    return [...s.party, ...s.box];
  }

  find(idOrNick: string): Thoughtmon | undefined {
    const q = idOrNick.toLowerCase();
    return this.listAll().find(
      (m) => m.id === idOrNick || m.nickname.toLowerCase() === q,
    );
  }

  /** Catch a thought-seed as a Thoughtmon (auto after complete, or manual). */
  catchFromSeed(input: {
    kind: ThoughtKind;
    seed: string;
    priorConversationId?: string;
    thoughtId?: string;
    stage?: ThoughtmonStage;
  }): Thoughtmon {
    const species = speciesForKind(input.kind);
    const mon: Thoughtmon = {
      id: `tm_${randomUUID().slice(0, 8)}`,
      nickname: inventNickname(input.seed, Date.now() % 97),
      speciesId: species.id,
      type: species.type,
      stage: input.stage ?? "wild",
      level: 1,
      xp: 0,
      creativity: input.kind === "muse" ? 72 : 48,
      sharpness: input.kind === "think" || input.kind === "decide" ? 64 : 40,
      seed: input.seed,
      caughtAt: new Date().toISOString(),
      ...(input.priorConversationId
        ? { priorConversationId: input.priorConversationId }
        : {}),
      ...(input.thoughtId ? { thoughtId: input.thoughtId } : {}),
      lineage: [species.id],
      moves: [...(STARTER_MOVES[species.id] ?? ["ponder"])],
      journal: [`caught from ${input.kind}: ${input.seed.slice(0, 80)}`],
    };

    const state = this.load();
    if (!state.seenSpecies.includes(species.id)) state.seenSpecies.push(species.id);
    if (state.party.length < PARTY_CAP) state.party.push(mon);
    else state.box.push(mon);
    this.save(state);
    this.appendLog({
      at: mon.caughtAt,
      event: "catch",
      id: mon.id,
      species: species.id,
      nickname: mon.nickname,
    });
    return mon;
  }

  /** Wild creative encounter — invent a seed and catch it. */
  encounter(kind: ThoughtKind = "muse"): { mon: Thoughtmon; prompt: string; lines: string[] } {
    const prompts = WILD_PROMPTS[kind] ?? WILD_PROMPTS.free!;
    const prompt = prompts[Math.floor(Math.random() * prompts.length)]!;
    const sp = speciesForKind(kind);
    const lines = [
      `A wild ${sp.displayName} appears!`,
      `  ${typeGlyph(sp.type)} ${prompt}`,
    ];
    const mon = this.catchFromSeed({ kind, seed: prompt, stage: "wild" });
    lines.push(`Gotcha! ${mon.nickname} (${sp.cry}) joined the party/box.`);
    return { mon, prompt, lines };
  }

  async train(options: {
    monId: string;
    gym: GymId;
    rootDir: string;
    paceMs?: number;
    onLine?: (line: string) => void;
  }): Promise<TrainingResult> {
    const state = this.load();
    const mon = [...state.party, ...state.box].find(
      (m) => m.id === options.monId || m.nickname === options.monId,
    );
    if (!mon) throw new Error(`Thoughtmon not found: ${options.monId}`);

    const lines: string[] = [];
    const emit = (line: string) => {
      lines.push(line);
      options.onLine?.(line);
    };

    emit(`── ${gymTitle(options.gym)} · training ${mon.nickname} ──`);
    emit(
      `  Lv.${mon.level} ${typeGlyph(mon.type)} ${mon.speciesId} · cre=${mon.creativity} sharp=${mon.sharpness}`,
    );

    let xpGained = 12;
    let creativityDelta = 0;
    let sharpnessDelta = 0;

    switch (options.gym) {
      case "atelier": {
        creativityDelta = 18;
        sharpnessDelta = 4;
        xpGained = 16;
        emit("  atelier: reverse realism ↔ not-realistic…");
        const session = await runCreativeReversalSession({
          rootDir: options.rootDir,
          steps: 2,
          paceMs: options.paceMs ?? 0,
          onLine: (l) => emit(`    ${l}`),
        });
        mon.journal.push(`atelier: ${session.records.length} reversals`);
        if (session.records[0]) {
          mon.moves = uniqueMoves([
            ...mon.moves,
            session.records[0].whereArtComesFrom.slice(0, 48),
          ]);
        }
        break;
      }
      case "observatory": {
        creativityDelta = 6;
        sharpnessDelta = 20;
        xpGained = 18;
        emit("  observatory: watch R drift…");
        const demo = await runThinkDemo({
          scenario: "drift",
          steps: 3,
          paceMs: options.paceMs ?? 0,
          onLine: (l) => emit(`    ${l}`),
        });
        mon.journal.push(
          `observatory: ${demo.finalAction} R=${demo.finalRatio.toFixed(3)}`,
        );
        mon.moves = uniqueMoves([...mon.moves, `ratio→${demo.finalAction}`]);
        break;
      }
      case "drill-yard": {
        creativityDelta = 4;
        sharpnessDelta = 12;
        xpGained = 14;
        emit("  drill-yard: slow institutional pace…");
        await sleep(options.paceMs ?? 0);
        mon.journal.push("drill-yard: paced rehearsal");
        mon.moves = uniqueMoves([...mon.moves, "slow pulse"]);
        break;
      }
      case "gatehouse": {
        creativityDelta = 2;
        sharpnessDelta = 16;
        xpGained = 15;
        emit("  gatehouse: constitution posture…");
        mon.journal.push("gatehouse: fail-closed stance practiced");
        mon.moves = uniqueMoves([...mon.moves, "constitution gate"]);
        break;
      }
      case "wilds":
      default: {
        creativityDelta = 10;
        sharpnessDelta = 10;
        xpGained = 20;
        emit("  wilds: free creative roam…");
        const poem = wildPoem(mon.seed, mon.creativity, mon.sharpness);
        emit(`    ${poem}`);
        mon.journal.push(`wilds: ${poem}`);
        mon.moves = uniqueMoves([...mon.moves, "wild invent"]);
        break;
      }
    }

    mon.xp += xpGained;
    mon.creativity = clamp(mon.creativity + creativityDelta, 0, 100);
    mon.sharpness = clamp(mon.sharpness + sharpnessDelta, 0, 100);
    while (mon.xp >= XP_PER_LEVEL) {
      mon.xp -= XP_PER_LEVEL;
      mon.level += 1;
      emit(`  ★ level up → ${mon.level}`);
    }
    if (mon.stage === "wild" || mon.stage === "egg") mon.stage = "trained";

    let evolved = false;
    if (canEvolve(mon)) {
      evolved = this.applyEvolution(mon, emit);
    }

    this.persistMon(state, mon);
    this.save(state);
    const summary = `Trained ${mon.nickname} at ${options.gym} (+${xpGained}xp)`;
    this.appendLog({
      at: new Date().toISOString(),
      event: "train",
      gym: options.gym,
      id: mon.id,
      xpGained,
      evolved,
      level: mon.level,
    });
    emit(`  ${summary}`);
    return {
      monId: mon.id,
      gym: options.gym,
      xpGained,
      creativityDelta,
      sharpnessDelta,
      evolved,
      lines,
      summary,
    };
  }

  /** Train every party member once through a creative circuit. */
  async trainParty(options: {
    rootDir: string;
    paceMs?: number;
    onLine?: (line: string) => void;
  }): Promise<TrainingResult[]> {
    const party = this.load().party;
    const results: TrainingResult[] = [];
    const circuit: GymId[] = ["atelier", "observatory", "wilds"];
    for (let i = 0; i < party.length; i++) {
      const mon = party[i]!;
      const gym = circuit[i % circuit.length]!;
      results.push(
        await this.train({
          monId: mon.id,
          gym,
          rootDir: options.rootDir,
          paceMs: options.paceMs ?? 0,
          ...(options.onLine ? { onLine: options.onLine } : {}),
        }),
      );
    }
    return results;
  }

  spar(aId: string, bId: string): SparResult {
    const a = this.find(aId);
    const b = this.find(bId);
    if (!a || !b) throw new Error("Need two Thoughtmon to spar");

    const ai = new MathematicalThinkingAI();
    const featA = featuresFromMon(a);
    const featB = featuresFromMon(b);
    const ratioA = ai.ratios.predictRatio(featA).ratio;
    const ratioB = ai.ratios.predictRatio(featB).ratio;
    const scoreA =
      a.creativity * 0.4 + a.sharpness * 0.4 + (1 / (ratioA + 0.2)) * 20;
    const scoreB =
      b.creativity * 0.4 + b.sharpness * 0.4 + (1 / (ratioB + 0.2)) * 20;
    const winner = scoreA >= scoreB ? a : b;
    const loser = winner.id === a.id ? b : a;

    const lines = [
      `Spar: ${a.nickname} vs ${b.nickname}`,
      `  ${a.nickname} R=${ratioA.toFixed(3)} score=${scoreA.toFixed(1)}`,
      `  ${b.nickname} R=${ratioB.toFixed(3)} score=${scoreB.toFixed(1)}`,
      `  Winner: ${winner.nickname} · ${winner.moves[0] ?? "ponder"}`,
      `  ${loser.nickname} learns from the bout.`,
    ];

    winner.xp += 8;
    loser.xp += 4;
    loser.journal.push(`spar loss vs ${winner.nickname}`);
    winner.journal.push(`spar win vs ${loser.nickname}`);

    const state = this.load();
    this.persistMon(state, winner);
    this.persistMon(state, loser);
    this.save(state);
    this.appendLog({
      at: new Date().toISOString(),
      event: "spar",
      a: a.id,
      b: b.id,
      winner: winner.id,
    });

    return {
      aId: a.id,
      bId: b.id,
      winnerId: winner.id,
      ratioA,
      ratioB,
      lines,
      summary: `${winner.nickname} won the creative spar`,
    };
  }

  dexCard(): string[] {
    const state = this.load();
    const lines = [
      `Thoughtmon Dex · seen ${state.seenSpecies.length}/6 · party ${state.party.length}/${PARTY_CAP} · box ${state.box.length}`,
    ];
    for (const m of state.party) {
      lines.push(
        `  ★ ${typeGlyph(m.type)} ${m.nickname} Lv.${m.level} [${m.stage}] cre=${m.creativity} sharp=${m.sharpness}`,
      );
    }
    for (const m of state.box.slice(0, 8)) {
      lines.push(`    · ${m.nickname} (${m.speciesId})`);
    }
    return lines;
  }

  private persistMon(state: DexState, mon: Thoughtmon): void {
    const pi = state.party.findIndex((m) => m.id === mon.id);
    if (pi >= 0) {
      state.party[pi] = mon;
      return;
    }
    const bi = state.box.findIndex((m) => m.id === mon.id);
    if (bi >= 0) state.box[bi] = mon;
  }

  private applyEvolution(mon: Thoughtmon, emit: (l: string) => void): boolean {
    if (mon.speciesId === "rasterdra") return false;
    const from = mon.speciesId;
    mon.speciesId = "rasterdra";
    mon.type = "dragon";
    mon.stage = "evolved";
    mon.lineage.push("rasterdra");
    mon.moves = uniqueMoves([...(STARTER_MOVES.rasterdra ?? []), ...mon.moves]);
    mon.creativity = clamp(mon.creativity + 10, 0, 100);
    mon.sharpness = clamp(mon.sharpness + 10, 0, 100);
    mon.journal.push(`evolved ${from} → rasterdra`);
    emit(`  ◈ ${mon.nickname} evolved into Rasterdra!`);
    const state = this.load();
    if (!state.seenSpecies.includes("rasterdra")) {
      state.seenSpecies.push("rasterdra");
      this.persistMon(state, mon);
      this.save(state);
    }
    return true;
  }
}

function canEvolve(mon: Thoughtmon): boolean {
  return (
    mon.level >= 5 &&
    mon.creativity >= 70 &&
    mon.sharpness >= 70 &&
    mon.speciesId !== "rasterdra" &&
    mon.stage !== "legend"
  );
}

function featuresFromMon(mon: Thoughtmon): MathFeatures {
  const cre = mon.creativity / 100;
  const sharp = mon.sharpness / 100;
  return {
    meanX: 30 + cre * 40,
    meanY: 30 + sharp * 40,
    covXX: 8 + (1 - cre) * 20,
    covYY: 8 + (1 - sharp) * 20,
    covXY: (cre - sharp) * 6,
    n: 20 + mon.level,
  };
}

function gymTitle(gym: GymId): string {
  switch (gym) {
    case "atelier":
      return "Atelier (creativity)";
    case "observatory":
      return "Observatory (math)";
    case "drill-yard":
      return "Drill yard (pace)";
    case "gatehouse":
      return "Gatehouse (constitution)";
    case "wilds":
      return "Wilds (free invent)";
  }
}

function uniqueMoves(moves: string[]): string[] {
  return [...new Set(moves.map((m) => m.trim()).filter(Boolean))].slice(0, 8);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms));
}

function wildPoem(seed: string, cre: number, sharp: number): string {
  const tone =
    cre > sharp
      ? "soft glaze over hard edges"
      : sharp > cre
        ? "sharp lines through fog"
        : "balanced wash";
  const word = seed.split(/\s+/).find((w) => w.length > 4) ?? "thought";
  return `${tone}; the ${word} learns to breathe at pace`;
}

const WILD_PROMPTS: Record<string, string[]> = {
  muse: [
    "Paint threat as velvet shadow — where does release live?",
    "Turn Σ into brush spread; finish the unfinished canvas.",
    "realistic * not_realistic: invent the hinge between them.",
  ],
  think: [
    "Centroid drifts north — simulate three horizons.",
    "If R≈1, what quiet action still holds the frame?",
    "Covariance whispers; name the uncertainty before it grows.",
  ],
  rehearse: [
    "Slow institutional drill: check the gate, then the lesson.",
    "Pace the pulse — one contain rehearsal, no rush.",
  ],
  decide: [
    "Constitution first: refuse the crime-shaped prompt.",
    "Route the allowlisted tool; leave the rest unsaid.",
  ],
  free: [
    "An open seed wants a shape — give it one line of truth.",
    "Parked mid-sentence; invent the ending kindly.",
  ],
};
