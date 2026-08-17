/**
 * Thoughtmon species + naming — creative creatures grown from thoughts.
 * Local-only play layer; no network, no gambling, constitution still gates decide.
 */

import type { ThoughtKind } from "../thoughts/incomplete-queue.js";
import type { ThoughtmonSpecies, ThoughtmonType } from "./types.js";

export const SPECIES: ThoughtmonSpecies[] = [
  {
    id: "museray",
    displayName: "Museray",
    type: "fairy",
    kind: "muse",
    cry: "muse~!",
    flavor: "Born where realism flips into not-realistic light.",
  },
  {
    id: "thinkowl",
    displayName: "Thinkowl",
    type: "psychic",
    kind: "think",
    cry: "ΣΣ!",
    flavor: "Watches centroid drift until R speaks.",
  },
  {
    id: "drillbit",
    displayName: "Drillbit",
    type: "steel",
    kind: "rehearse",
    cry: "ready.",
    flavor: "Institutional drills with a slow pulse.",
  },
  {
    id: "decidant",
    displayName: "Decidant",
    type: "steel",
    kind: "decide",
    cry: "gate!",
    flavor: "Constitution first, then the tool.",
  },
  {
    id: "freeling",
    displayName: "Freeling",
    type: "normal",
    kind: "free",
    cry: "…?",
    flavor: "An unfinished seed waiting for a shape.",
  },
  {
    id: "rasterdra",
    displayName: "Rasterdra",
    type: "dragon",
    kind: "think",
    cry: "R>>1!",
    flavor: "Evolved when creativity and sharpness braid.",
  },
];

export function speciesForKind(kind: ThoughtKind): ThoughtmonSpecies {
  return SPECIES.find((s) => s.kind === kind) ?? SPECIES.find((s) => s.id === "freeling")!;
}

export function speciesById(id: string): ThoughtmonSpecies | undefined {
  return SPECIES.find((s) => s.id === id);
}

export function typeGlyph(type: ThoughtmonType): string {
  switch (type) {
    case "fairy":
      return "✧";
    case "psychic":
      return "◉";
    case "steel":
      return "▣";
    case "dragon":
      return "◈";
    case "normal":
    default:
      return "○";
  }
}

const NICK_PREFIX = [
  "Soft",
  "Wild",
  "Quiet",
  "Bright",
  "Drift",
  "Sparse",
  "Loyal",
  "Odd",
  "Keen",
  "Lumen",
];

const NICK_SUFFIX = [
  "Spark",
  "Coil",
  "Bloom",
  "Trace",
  "Knot",
  "Echo",
  "Glyph",
  "Pulse",
  "Veil",
  "Root",
];

export function inventNickname(seed: string, salt = 0): string {
  let h = salt;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  const a = NICK_PREFIX[h % NICK_PREFIX.length]!;
  const b = NICK_SUFFIX[Math.floor(h / NICK_PREFIX.length) % NICK_SUFFIX.length]!;
  return `${a}${b}`;
}

export const STARTER_MOVES: Record<string, string[]> = {
  museray: ["chiaroscuro flip", "brush Σ", "not-realistic glaze"],
  thinkowl: ["horizon simulate", "ratio cry", "uncertainty blink"],
  drillbit: ["slow pace", "institutional drill", "lesson stamp"],
  decidant: ["constitution gate", "allowlist tap", "contain snap"],
  freeling: ["park seed", "wait stitch", "open question"],
  rasterdra: ["live raster roar", "covariance wing", "creative reverse"],
};
