import type { GwavQuant } from "./types.js";

/** Rough local VRAM/RAM footprint for a GGUF-class blob (bytes/param heuristics). */
export function estimateVramMb(paramsBillion: number, quant: GwavQuant): number {
  const bytesPerParam = quant === "Q8_0" ? 1.1 : 0.62;
  return Math.round((paramsBillion * 1e9 * bytesPerParam) / 1e6);
}

export function formatFootprint(paramsBillion: number, quant: GwavQuant): string {
  return `~${estimateVramMb(paramsBillion, quant)} MB (${quant}, ${paramsBillion}B params)`;
}
