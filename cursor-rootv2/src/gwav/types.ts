export const GWAV_MAGIC = "GWAV";
/** Legacy flat layout (v1). */
export const GWAV_VERSION_V1 = 1;
/** WAV-like chunked layout: fractal semantics + harmonic mean, no duration. */
export const GWAV_VERSION = 2;
/** Cognitive byte-rate / “bitrate” — fixed for all .gwav files. */
export const GWAV_BITRATE = 1_400_000;
export const GWAV_MEAN_DIMS = 64;
export const GWAV_FRACTAL_SCALES = 4;

export type GwavQuant = "Q4_K_M" | "Q8_0";
export type GwavCarrierHz = 432 | 528;

/** Six orbital nodes + hub origin — same 7-port fabric as CognitiveFabric. */
export type GwavNodeId =
  | "origin"
  | "ruby"
  | "sapphire"
  | "emerald"
  | "amethyst"
  | "topaz"
  | "obsidian";

export const GWAV_NODES: readonly GwavNodeId[] = [
  "origin",
  "ruby",
  "sapphire",
  "emerald",
  "amethyst",
  "topaz",
  "obsidian",
];

export const NODE_TO_PORT: Record<GwavNodeId, string> = {
  origin: "PC",
  ruby: "P0",
  sapphire: "P1",
  emerald: "P2",
  amethyst: "P3",
  topaz: "P4",
  obsidian: "P5",
};

export interface GwavCard {
  id: string;
  name: string;
  node: GwavNodeId;
  quantization: GwavQuant;
  carrierHz: GwavCarrierHz;
  paramsBillion: number;
  systemDirective: string;
  constitutionBound: true;
  parentFormat: "gguf";
  sidecarGguf?: string;
  loraAdapters?: string[];
  ggufSha256?: string;
  waveformFingerprint: string;
}

export interface GwavHeader extends GwavCard {
  format: "gwav";
  version: number;
  /** Fixed cognitive byte-rate (WAV nAvgBytesPerSec analogue). */
  bitrate?: number;
  /** WAV fmt: sampleCount = 0 → no duration (infinite semantic wave, bin-like). */
  sampleCount?: 0;
}

/** One token’s fractal harmonic ladder at multiple scales. */
export interface FractalToken {
  field: string;
  token: string;
  scales: Array<{ scale: number; phase: number; amplitude: number }>;
}

export interface FractalIndex {
  carrierHz: GwavCarrierHz;
  bitrate: number;
  tokens: FractalToken[];
}

export interface HarmonicMean {
  dims: number;
  vector: Float64Array;
  hitCount: number;
}

export interface GwavFile {
  header: GwavHeader;
  gguf: Uint8Array;
  fractal?: FractalIndex;
  mean?: HarmonicMean;
}

export interface ResonanceHit {
  field: string;
  token: string;
  queryToken: string;
  scale: number;
  score: number;
}

export interface ResonanceMatch {
  score: number;
  overlap: number;
  hits: ResonanceHit[];
  harmonic: "resonate" | "neutral";
}
