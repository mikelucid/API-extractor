import { tokenize } from "../harmony/index.js";
import {
  buildFractalIndex,
  extendHarmonicMean,
  initialHarmonicMean,
  tokenVector,
} from "./fractal.js";
import type { FractalIndex, GwavFile, HarmonicMean, ResonanceHit, ResonanceMatch } from "./types.js";
import { GWAV_FRACTAL_SCALES } from "./types.js";

export const RESONANCE_THRESHOLD = 0.35;

function phaseResonance(a: number, b: number): number {
  return Math.cos(a - b);
}

function queryFractal(query: string, carrierHz: FractalIndex["carrierHz"]): FractalIndex {
  return buildFractalIndex({
    id: "query",
    name: "query",
    node: "origin",
    quantization: "Q4_K_M",
    carrierHz,
    paramsBillion: 0,
    systemDirective: query,
    constitutionBound: true,
    parentFormat: "gguf",
  });
}

/** Search fractal semantics by harmonic resonance (multi-scale phase alignment). */
export function matchHarmonicResonance(fractal: FractalIndex, query: string): ResonanceMatch {
  const qIndex = queryFractal(query, fractal.carrierHz);
  const hits: ResonanceHit[] = [];
  let scoreSum = 0;
  let pairs = 0;

  for (const qTok of qIndex.tokens) {
    for (const entry of fractal.tokens) {
      if (qTok.token !== entry.token) continue;
      for (let s = 0; s < GWAV_FRACTAL_SCALES; s++) {
        const qs = qTok.scales[s]!;
        const es = entry.scales[s]!;
        const score = qs.amplitude * es.amplitude * phaseResonance(qs.phase, es.phase);
        if (score > 0.05) {
          hits.push({
            field: entry.field,
            token: entry.token,
            queryToken: qTok.token,
            scale: s,
            score,
          });
          scoreSum += score;
          pairs += 1;
        }
      }
    }
  }

  const queryTokens = tokenize(query);
  const indexTokens = new Set(fractal.tokens.map((t) => t.token));
  const overlap =
    queryTokens.length === 0
      ? 0
      : queryTokens.filter((t) => indexTokens.has(t)).length / queryTokens.length;
  const score = pairs === 0 ? overlap * 0.5 : scoreSum / pairs;

  return {
    score,
    overlap,
    hits,
    harmonic: score >= RESONANCE_THRESHOLD || overlap >= RESONANCE_THRESHOLD ? "resonate" : "neutral",
  };
}

export function queryMeanVector(query: string, carrierHz: FractalIndex["carrierHz"]): Float64Array {
  const qIndex = queryFractal(query, carrierHz);
  const mean = initialHarmonicMean(qIndex);
  return mean.vector;
}

/** When harmonics align, extend the card’s running mean toward the query vector. */
export function resonateAndExtendMean(
  file: GwavFile,
  query: string,
): { match: ResonanceMatch; mean: HarmonicMean; extended: boolean } {
  const fractal = file.fractal ?? buildFractalIndex(file.header);
  const match = matchHarmonicResonance(fractal, query);
  const base = file.mean ?? initialHarmonicMean(fractal);
  if (match.harmonic !== "resonate") {
    return { match, mean: base, extended: false };
  }
  const qVec = queryMeanVector(query, fractal.carrierHz);
  const weight = Math.max(1, Math.round(match.score * 10));
  return {
    match,
    mean: extendHarmonicMean(base, qVec, weight),
    extended: true,
  };
}
