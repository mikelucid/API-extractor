export const GWAV_MAGIC = "GWAV";
export const GWAV_VERSION = 1;

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
  /** Owner-declared LoRA sidecar paths (not downloaded adapters). */
  loraAdapters?: string[];
  ggufSha256?: string;
  waveformFingerprint: string;
}

export interface GwavHeader extends GwavCard {
  format: "gwav";
  version: number;
}

export interface GwavFile {
  header: GwavHeader;
  /** Embedded GGUF bytes when present; otherwise empty and sidecarGguF may point at a .gguf. */
  gguf: Uint8Array;
}
