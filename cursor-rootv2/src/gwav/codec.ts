import { createHash } from "node:crypto";
import {
  buildFractalIndex,
  decodeFractalChunk,
  decodeMeanChunk,
  encodeFractalChunk,
  encodeMeanChunk,
  initialHarmonicMean,
} from "./fractal.js";
import {
  GWAV_BITRATE,
  GWAV_MAGIC,
  GWAV_VERSION,
  GWAV_VERSION_V1,
  type GwavCard,
  type GwavFile,
  type GwavHeader,
} from "./types.js";
import { waveformFingerprint } from "./waveform.js";

const GGUF_MAGIC = Buffer.from("GGUF");
const FLAG_NO_DURATION = 1;

type ChunkMap = Map<string, Buffer>;

function encodeFmtChunk(carrierHz: number): Buffer {
  const buf = Buffer.alloc(16);
  buf.writeUInt16LE(0x4757, 0); // custom “GW” cognitive wave (WAV wFormatTag analogue)
  buf.writeUInt16LE(1, 2);
  buf.writeUInt32LE(carrierHz, 4);
  buf.writeUInt32LE(GWAV_BITRATE, 8);
  buf.writeUInt16LE(8, 12);
  buf.writeUInt16LE(64, 14);
  return buf;
}

function writeChunk(fourcc: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length);
  out.write(fourcc, 0, 4, "ascii");
  out.writeUInt32LE(data.length, 4);
  data.copy(out, 8);
  return out;
}

function parseChunks(buf: Buffer, start: number): ChunkMap {
  const chunks: ChunkMap = new Map();
  let offset = start;
  while (offset + 8 <= buf.length) {
    const id = buf.subarray(offset, offset + 4).toString("ascii");
    const size = buf.readUInt32LE(offset + 4);
    offset += 8;
    if (offset + size > buf.length) {
      throw new Error("Truncated .gwav chunk.");
    }
    chunks.set(id, Buffer.from(buf.subarray(offset, offset + size)));
    offset += size;
  }
  return chunks;
}

function headerFromCard(card: Omit<GwavCard, "waveformFingerprint">): GwavHeader {
  const fingerprint = waveformFingerprint(card);
  return {
    ...card,
    format: "gwav",
    version: GWAV_VERSION,
    waveformFingerprint: fingerprint,
    constitutionBound: true,
    parentFormat: "gguf",
    bitrate: GWAV_BITRATE,
    sampleCount: 0,
  };
}

function validateHeader(header: GwavHeader): void {
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
}

function assembleFile(header: GwavHeader, gguf: Uint8Array, chunks: ChunkMap): GwavFile {
  const fractal = chunks.has("frct")
    ? decodeFractalChunk(chunks.get("frct")!, header.carrierHz)
    : buildFractalIndex(header);
  const mean = chunks.has("mean")
    ? decodeMeanChunk(chunks.get("mean")!)
    : initialHarmonicMean(fractal);
  return { header, gguf, fractal, mean };
}

/** v2: WAV-like chunked bin — fmt/meta/frct/mean/gguf, bitrate 1.4M, sampleCount 0. */
export function encodeGwav(card: Omit<GwavCard, "waveformFingerprint">, gguf?: Uint8Array): Buffer {
  const header = headerFromCard(card);
  const fractal = buildFractalIndex(card);
  const mean = initialHarmonicMean(fractal);
  const payload = gguf && gguf.byteLength > 0 ? Buffer.from(gguf) : Buffer.alloc(0);

  const body = Buffer.concat([
    writeChunk("fmt ", encodeFmtChunk(card.carrierHz)),
    writeChunk("meta", Buffer.from(JSON.stringify(header), "utf8")),
    writeChunk("frct", encodeFractalChunk(fractal)),
    writeChunk("mean", encodeMeanChunk(mean)),
    writeChunk("gguf", payload),
  ]);

  const out = Buffer.alloc(24 + body.length);
  out.write(GWAV_MAGIC, 0, "ascii");
  out.writeUInt32LE(GWAV_VERSION, 4);
  out.writeUInt32LE(FLAG_NO_DURATION, 8);
  out.writeUInt32LE(GWAV_BITRATE, 12);
  out.writeUInt32LE(card.carrierHz, 16);
  out.writeUInt32LE(0, 20); // sampleCount = 0 → no duration
  body.copy(out, 24);
  return out;
}

/** Re-write an existing file after harmonic mean extension. */
export function reencodeGwav(file: GwavFile): Buffer {
  const header = { ...file.header, version: GWAV_VERSION, bitrate: GWAV_BITRATE, sampleCount: 0 as const };
  const fractal = file.fractal ?? buildFractalIndex(header);
  const mean = file.mean ?? initialHarmonicMean(fractal);
  const payload = Buffer.from(file.gguf);

  const body = Buffer.concat([
    writeChunk("fmt ", encodeFmtChunk(header.carrierHz)),
    writeChunk("meta", Buffer.from(JSON.stringify(header), "utf8")),
    writeChunk("frct", encodeFractalChunk(fractal)),
    writeChunk("mean", encodeMeanChunk(mean)),
    writeChunk("gguf", payload),
  ]);

  const out = Buffer.alloc(24 + body.length);
  out.write(GWAV_MAGIC, 0, "ascii");
  out.writeUInt32LE(GWAV_VERSION, 4);
  out.writeUInt32LE(FLAG_NO_DURATION, 8);
  out.writeUInt32LE(GWAV_BITRATE, 12);
  out.writeUInt32LE(header.carrierHz, 16);
  out.writeUInt32LE(0, 20);
  body.copy(out, 24);
  return out;
}

function decodeGwavV1(b: Buffer): GwavFile {
  const headerLen = b.readUInt32LE(8);
  const headerEnd = 12 + headerLen;
  if (b.length < headerEnd) {
    throw new Error("Truncated .gwav header.");
  }
  const header = JSON.parse(b.subarray(12, headerEnd).toString("utf8")) as GwavHeader;
  validateHeader(header);
  const gguf = new Uint8Array(b.subarray(headerEnd));
  if (gguf.byteLength > 0 && !Buffer.from(gguf.subarray(0, 4)).equals(GGUF_MAGIC)) {
    throw new Error("Embedded payload is not GGUF (magic mismatch).");
  }
  return assembleFile({ ...header, version: GWAV_VERSION, bitrate: GWAV_BITRATE, sampleCount: 0 }, gguf, new Map());
}

function decodeGwavV2(b: Buffer): GwavFile {
  if (b.length < 24) {
    throw new Error("Truncated .gwav v2 header.");
  }
  const bitrate = b.readUInt32LE(12);
  if (bitrate !== GWAV_BITRATE) {
    throw new Error(`.gwav bitrate must be ${GWAV_BITRATE} (got ${bitrate}).`);
  }
  const sampleCount = b.readUInt32LE(20);
  if (sampleCount !== 0) {
    throw new Error(".gwav v2 must have sampleCount 0 (no duration).");
  }
  const chunks = parseChunks(b, 24);
  const meta = chunks.get("meta");
  if (!meta) {
    throw new Error(".gwav v2 missing meta chunk.");
  }
  const header = JSON.parse(meta.toString("utf8")) as GwavHeader;
  validateHeader(header);
  const gguf = new Uint8Array(chunks.get("gguf") ?? Buffer.alloc(0));
  if (gguf.byteLength > 0 && !Buffer.from(gguf.subarray(0, 4)).equals(GGUF_MAGIC)) {
    throw new Error("Embedded payload is not GGUF (magic mismatch).");
  }
  return assembleFile(header, gguf, chunks);
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
  if (version === GWAV_VERSION_V1) {
    return decodeGwavV1(b);
  }
  if (version === GWAV_VERSION) {
    return decodeGwavV2(b);
  }
  throw new Error(`Unsupported .gwav version ${version}.`);
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
    `# Generated from ${file.header.id}.gwav (GGUF upgrade, carrier ${file.header.carrierHz} Hz, bitrate ${GWAV_BITRATE})`,
    `FROM ${from}`,
    `SYSTEM """${file.header.systemDirective.replace(/"""/g, "''")}"""`,
    "PARAMETER temperature 0.7",
    "PARAMETER top_p 0.9",
  ].join("\n");
}

export function inspectGwavContainer(buf: Uint8Array): {
  version: number;
  bitrate: number;
  sampleCount: number;
  chunkIds: string[];
} {
  const b = Buffer.from(buf);
  const version = b.readUInt32LE(4);
  if (version === GWAV_VERSION_V1) {
    return { version, bitrate: GWAV_BITRATE, sampleCount: 0, chunkIds: ["meta", "gguf"] };
  }
  const chunks = parseChunks(b, 24);
  return {
    version,
    bitrate: b.readUInt32LE(12),
    sampleCount: b.readUInt32LE(20),
    chunkIds: [...chunks.keys()],
  };
}
