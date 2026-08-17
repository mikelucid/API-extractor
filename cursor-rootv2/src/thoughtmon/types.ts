/** Thoughtmon — creative creatures grown from interrupted / finished thoughts. */

export type ThoughtmonType =
  | "psychic" // think
  | "fairy" // muse
  | "steel" // rehearse / decide
  | "normal" // free
  | "dragon"; // evolved hybrid

export type ThoughtmonStage = "egg" | "wild" | "trained" | "evolved" | "legend";

export interface ThoughtmonSpecies {
  id: string;
  displayName: string;
  type: ThoughtmonType;
  kind: "muse" | "think" | "rehearse" | "decide" | "free";
  cry: string;
  flavor: string;
}

export interface Thoughtmon {
  id: string;
  nickname: string;
  speciesId: string;
  type: ThoughtmonType;
  stage: ThoughtmonStage;
  level: number;
  xp: number;
  /** Creativity stamina — spent in training, recovers slowly via rest/muse. */
  creativity: number;
  /** Math sharpness — rises with think/spar drills. */
  sharpness: number;
  seed: string;
  caughtAt: string;
  priorConversationId?: string;
  thoughtId?: string;
  lineage: string[];
  moves: string[];
  journal: string[];
}

export interface TrainingResult {
  monId: string;
  gym: string;
  xpGained: number;
  creativityDelta: number;
  sharpnessDelta: number;
  evolved: boolean;
  lines: string[];
  summary: string;
}

export interface SparResult {
  aId: string;
  bId: string;
  winnerId: string;
  ratioA: number;
  ratioB: number;
  lines: string[];
  summary: string;
}
