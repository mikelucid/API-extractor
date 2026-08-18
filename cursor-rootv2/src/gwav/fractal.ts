import { createHash } from "node:crypto";
import { tokenize } from "../harmony/index.js";
import {
  GWAV_BITRATE,
  GWAV_FRACTAL_SCALES,
  GWAV_MEAN_DIMS,
  type FractalIndex,
  type FractalToken,
  type GwavCard,
  type GwavCarrierHz,
  type HarmonicMean,
} from "./types.js";

const SEMANTIC_FIELDS = ["id", "name", "node", "quantization", "systemDirective"] as const;

function unitHash(text: string): number {
  const hex = createHash("sha256").update(text).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) / 0xffffffff;
}

/** Deterministic phase on the 1.4M cognitive bitrate lattice. */
export function fractalPhase(token: string, field: string, scale: number, carrierHz: GwavCarrierHz): number {
  const u = unitHash(`${field}|${token}|${scale}`);
  const freq = (carrierHz * Math.pow(2, scale)) / GWAV_BITRATE;
  return Math.sin(2 * Math.PI * freq * u * 1024);
}

export function fractalAmplitude(scale: number): number {
  return 1 / Math.pow(2, scale);
}

export function tokenVector(token: string, field: string, carrierHz: GwavCarrierHz, dims = GWAV_MEAN_DIMS): Float64Array {
  const out = new Float64Array(dims);
  for (let i = 0; i < dims; i++) {
    out[i] = fractalPhase(token, field, i % GWAV_FRACTAL_SCALES, carrierHz);
  }
  return out;
}

function addScaled(target: Float64Array, source: Float64Array, weight: number): void {
  for (let i = 0; i < target.length; i++) {
    target[i]! += source[i]! * weight;
  }
}

/** Fractalize card semantics into a searchable multi-scale index. */
export function buildFractalIndex(card: Omit<GwavCard, "waveformFingerprint">): FractalIndex {
  const tokens: FractalToken[] = [];
  for (const field of SEMANTIC_FIELDS) {
    const raw = String(card[field as keyof typeof card] ?? "");
    for (const token of tokenize(raw)) {
      const scales = [];
      for (let scale = 0; scale < GWAV_FRACTAL_SCALES; scale++) {
        scales.push({
          scale,
          phase: fractalPhase(token, field, scale, card.carrierHz),
          amplitude: fractalAmplitude(scale),
        });
      }
      tokens.push({ field, token, scales });
    }
  }
  return { carrierHz: card.carrierHz, bitrate: GWAV_BITRATE, tokens };
}

/** Initial harmonic mean from all semantic tokens (finest scale dominates). */
export function initialHarmonicMean(fractal: FractalIndex): HarmonicMean {
  const vector = new Float64Array(GWAV_MEAN_DIMS);
  let weightSum = 0;
  for (const entry of fractal.tokens) {
    const finest = entry.scales[GWAV_FRACTAL_SCALES - 1]!;
    const v = tokenVector(entry.token, entry.field, fractal.carrierHz);
    addScaled(vector, v, finest.amplitude);
    weightSum += finest.amplitude;
  }
  if (weightSum > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i]! /= weightSum;
    }
  }
  return { dims: GWAV_MEAN_DIMS, vector, hitCount: 0 };
}

export function encodeFractalChunk(fractal: FractalIndex): Buffer {
  const parts: Buffer[] = [];
  parts.push(Buffer.alloc(4));
  parts[0]!.writeUInt32LE(fractal.tokens.length, 0);
  for (const entry of fractal.tokens) {
    const fieldBuf = Buffer.from(entry.field, "utf8");
    const tokenBuf = Buffer.from(entry.token, "utf8");
    const head = Buffer.alloc(1 + fieldBuf.length + 1 + tokenBuf.length + 1);
    let o = 0;
    head.writeUInt8(fieldBuf.length, o);
    o += 1;
    fieldBuf.copy(head, o);
    o += fieldBuf.length;
    head.writeUInt8(tokenBuf.length, o);
    o += 1;
    tokenBuf.copy(head, o);
    o += tokenBuf.length;
    head.writeUInt8(entry.scales.length, o);
    parts.push(head);
    const body = Buffer.alloc(entry.scales.length * 17);
    entry.scales.forEach((s, i) => {
      const off = i * 17;
      body.writeUInt8(s.scale, off);
      body.writeDoubleLE(s.phase, off + 1);
      body.writeDoubleLE(s.amplitude, off + 9);
    });
    parts.push(body);
  }
  return Buffer.concat(parts);
}

export function decodeFractalChunk(buf: Uint8Array, carrierHz: GwavCarrierHz): FractalIndex {
  const b = Buffer.from(buf);
  if (b.length < 4) {
    throw new Error("Truncated fractal chunk.");
  }
  const count = b.readUInt32LE(0);
  const tokens: FractalToken[] = [];
  let offset = 4;
  for (let n = 0; n < count; n++) {
    if (offset + 3 > b.length) throw new Error("Truncated fractal token.");
    const fieldLen = b.readUInt8(offset);
    offset += 1;
    const field = b.subarray(offset, offset + fieldLen).toString("utf8");
    offset += fieldLen;
    const tokenLen = b.readUInt8(offset);
    offset += 1;
    const token = b.subarray(offset, offset + tokenLen).toString("utf8");
    offset += tokenLen;
    const scaleCount = b.readUInt8(offset);
    offset += 1;
    const scales = [];
    for (let s = 0; s < scaleCount; s++) {
      if (offset + 17 > b.length) throw new Error("Truncated fractal scale.");
      scales.push({
        scale: b.readUInt8(offset),
        phase: b.readDoubleLE(offset + 1),
        amplitude: b.readDoubleLE(offset + 9),
      });
      offset += 17;
    }
    tokens.push({ field, token, scales });
  }
  return { carrierHz, bitrate: GWAV_BITRATE, tokens };
}

export function encodeMeanChunk(mean: HarmonicMean): Buffer {
  const buf = Buffer.alloc(8 + mean.dims * 8);
  buf.writeUInt32LE(mean.dims, 0);
  buf.writeUInt32LE(mean.hitCount, 4);
  for (let i = 0; i < mean.dims; i++) {
    buf.writeDoubleLE(mean.vector[i]!, 8 + i * 8);
  }
  return buf;
}

export function decodeMeanChunk(buf: Uint8Array): HarmonicMean {
  const b = Buffer.from(buf);
  const dims = b.readUInt32LE(0);
  const hitCount = b.readUInt32LE(4);
  const vector = new Float64Array(dims);
  for (let i = 0; i < dims; i++) {
    vector[i] = b.readDoubleLE(8 + i * 8);
  }
  return { dims, vector, hitCount };
}

/** Extend the stored mean toward a resonant query (running weighted average). */
export function extendHarmonicMean(
  mean: HarmonicMean,
  queryVector: Float64Array,
  resonanceWeight: number,
): HarmonicMean {
  const next = new Float64Array(mean.dims);
  const total = mean.hitCount + resonanceWeight;
  for (let i = 0; i < mean.dims; i++) {
    next[i] = (mean.vector[i]! * mean.hitCount + queryVector[i]! * resonanceWeight) / total;
  }
  return { dims: mean.dims, vector: next, hitCount: Math.round(total) };
}
