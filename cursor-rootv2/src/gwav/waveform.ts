import { createHash } from "node:crypto";
import type { GwavCard, GwavCarrierHz } from "./types.js";

/**
 * Cognitive waveform fingerprint: deterministic 64-sample sine at the card's
 * Solfeggio carrier (432 Hz or 528 Hz). This is a verifiable signature, not
 * audio DSP used as model weights.
 */
export function waveformFingerprint(card: Omit<GwavCard, "waveformFingerprint">): string {
  const samples = sineSamples(card.carrierHz, 64);
  const h = createHash("sha256");
  h.update(`${card.id}|${card.node}|${card.quantization}|${card.carrierHz}|${card.systemDirective}`);
  h.update(Buffer.from(samples.buffer));
  return h.digest("hex");
}

export function sineSamples(hz: GwavCarrierHz, n: number, sampleRate = 44100): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate);
  }
  return out;
}

/** Solfeggio chime preview for inspect/playground — not model weights. */
export function chimePreview(hz: GwavCarrierHz, n = 16): { carrierHz: GwavCarrierHz; sampleRate: number; samples: number[] } {
  return {
    carrierHz: hz,
    sampleRate: 44100,
    samples: Array.from(sineSamples(hz, n)),
  };
}
