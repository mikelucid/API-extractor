export type HarmonicKind = 'resonate' | 'dissonate' | 'neutral'

export type Signature = {
  tokens: string[]
  polarity: number
  kind: string
}

const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'is',
  'at',
  'by',
  'from',
  'that',
  'this',
  'it',
])

export function tokenize(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOP.has(raw) || seen.has(raw)) continue
    seen.add(raw)
    out.push(raw)
  }
  return out
}

export function polarityOf(outcome: 'success' | 'failure' | 'info'): number {
  if (outcome === 'success') return 1
  if (outcome === 'failure') return -1
  return 0
}

export function signatureOf(input: { kind: string; outcome: 'success' | 'failure' | 'info'; detail: string }): Signature {
  return {
    kind: input.kind,
    polarity: polarityOf(input.outcome),
    tokens: tokenize(`${input.kind} ${input.detail}`),
  }
}

export function jaccard(a: string[], b: string[]): number {
  const left = new Set(a)
  const right = new Set(b)
  if (left.size === 0 && right.size === 0) return 0
  let inter = 0
  for (const t of left) if (right.has(t)) inter += 1
  const union = left.size + right.size - inter
  return union === 0 ? 0 : inter / union
}

export type HarmonyScore = {
  harmonic: HarmonicKind
  score: number
  overlap: number
}

/** Positive score = resonance; negative = dissonance. */
export function scoreHarmony(a: Signature, b: Signature): HarmonyScore {
  let overlap = jaccard(a.tokens, b.tokens)
  if (a.kind === b.kind) overlap = Math.min(1, overlap + 0.15)
  const polarity = a.polarity * b.polarity
  if (overlap < 0.2) return { harmonic: 'neutral', score: overlap, overlap }
  if (polarity < 0) return { harmonic: 'dissonate', score: -overlap, overlap }
  return { harmonic: 'resonate', score: overlap, overlap }
}

export const RESONANCE_THRESHOLD = 0.35
export const DISSONANCE_THRESHOLD = 0.35
