import { createHash } from "node:crypto";
import {
  GWAV_MAGIC,
  GWAV_VERSION,
  type GwavCard,
  type GwavFile,
  type GwavHeader,
} from "./types.js";
import { waveformFingerprint } from "./waveform.js";

const GGUF_MAGIC = Buffer.from("GGUF");

export function encodeGwav(card: Omit<GwavCard, "waveformFingerprint">, gguf?: Uint8Array): Buffer {
  const fingerprint = waveformFingerprint(card);
  const header: GwavHeader = {
    ...card,
    format: "gwav",
    version: GWAV_VERSION,
    waveformFingerprint: fingerprint,
    constitutionBound: true,
    parentFormat: "gguf",
  };
  const headerBuf = Buffer.from(JSON.stringify(header), "utf8");
  const payload = gguf && gguf.byteLength > 0 ? Buffer.from(gguf) : Buffer.alloc(0);
  const out = Buffer.alloc(12 + headerBuf.length + payload.length);
  out.write(GWAV_MAGIC, 0, "ascii");
  out.writeUInt32LE(GWAV_VERSION, 4);
  out.writeUInt32LE(headerBuf.length, 8);
  headerBuf.copy(out, 12);
  payload.copy(out, 12 + headerBuf.length);
  return out;
}

export function decodeGwav(buf: Uint8Array): GwavFile {
  const b = Buffer.from(buf);
  if (b.length < 12) {
    throw new Error("Not a .gwav file (too short).");
  }
  const magic = b.subarray(0, 4).toString("ascii");
  if (magic !== GWAV_MAGIC) {
    throw new Error(`Not a .gwav file (magic ${magic}).`);
  }
  const version = b.readUInt32LE(4);
  if (version !== GWAV_VERSION) {
    throw new Error(`Unsupported .gwav version ${version}.`);
  }
  const headerLen = b.readUInt32LE(8);
  const headerEnd = 12 + headerLen;
  if (b.length < headerEnd) {
    throw new Error("Truncated .gwav header.");
  }
  const header = JSON.parse(b.subarray(12, headerEnd).toString("utf8")) as GwavHeader;
  if (header.format !== "gwav" || header.parentFormat !== "gguf") {
    throw new Error("Invalid .gwav header.");
  }
  if (!header.constitutionBound) {
    throw new Error(".gwav cards must be constitution-bound.");
  }
  const expected = waveformFingerprint(header);
  if (header.waveformFingerprint !== expected) {
    throw new Error(".gwav waveform fingerprint mismatch.");
  }
  const gguf = new Uint8Array(b.subarray(headerEnd));
  if (gguf.byteLength > 0 && !Buffer.from(gguf.subarray(0, 4)).equals(GGUF_MAGIC)) {
    throw new Error("Embedded payload is not GGUF (magic mismatch).");
  }
  return { header, gguf };
}

export function ggufSha256(gguf: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(gguf)).digest("hex");
}

export function stubGgufBlob(): Buffer {
  const blob = Buffer.alloc(16, 0);
  GGUF_MAGIC.copy(blob, 0);
  blob.writeUInt32LE(3, 4);
  return blob;
}

export function toOllamaModelfile(file: GwavFile): string {
  const from = file.header.sidecarGguf ?? (file.gguf.byteLength > 0 ? "./weights.gguf" : "scratch");
  return [
    `# Generated from ${file.header.id}.gwav (GGUF parent, carrier ${file.header.carrierHz} Hz)`,
    `FROM ${from}`,
    `SYSTEM """${file.header.systemDirective.replace(/"""/g, "''")}"""`,
    "PARAMETER temperature 0.7",
    "PARAMETER top_p 0.9",
  ].join("\n");
}
