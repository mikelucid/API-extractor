import { createReadStream, openSync, readSync, closeSync } from "node:fs";
import { accessSync, constants, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type { GwavFile } from "./types.js";

export const DEFAULT_LLAMA2_ID = "llama2";
export const DEFAULT_LLAMA2_FILENAME = "llama2.gguf";
/** Common typo for `.gguf`. */
export const LLAMA2_GUFF_FILENAME = "llama2.guff";

export function gwavModelsDir(dataDir: string): string {
  return join(dataDir, "gwav", "models");
}

export function candidateGgufPaths(dataDir: string): string[] {
  const models = gwavModelsDir(dataDir);
  const env = process.env.LLAMA2_GGUF ?? process.env.GWAV_GGUF_PATH;
  return [
    ...(env ? [env] : []),
    join(models, DEFAULT_LLAMA2_FILENAME),
    join(models, LLAMA2_GUFF_FILENAME),
    join(homedir(), "models", DEFAULT_LLAMA2_FILENAME),
    join(homedir(), DEFAULT_LLAMA2_FILENAME),
    "/models/llama2.gguf",
  ];
}

export function findLlama2Gguf(dataDir: string): string | null {
  for (const p of candidateGgufPaths(dataDir)) {
    if (isValidGgufFile(p)) return resolve(p);
  }
  return null;
}

export function isValidGgufFile(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    accessSync(path, constants.R_OK);
    const fd = openSync(path, "r");
    const magic = Buffer.alloc(4);
    readSync(fd, magic, 0, 4, 0);
    closeSync(fd);
    return magic.toString("ascii") === "GGUF";
  } catch {
    return false;
  }
}

export async function sha256File(path: string): Promise<string> {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

/** Resolve sidecar path for a card: header sidecar → env → vault models dir. */
export function resolveGgufPath(file: GwavFile, dataDir: string): string | null {
  const candidates = [
    file.header.sidecarGguf,
    process.env.LLAMA2_GGUF,
    process.env.GWAV_GGUF_PATH,
    ...candidateGgufPaths(dataDir).filter((p) => p !== file.header.sidecarGguf),
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const abs = isAbsolute(raw) ? raw : resolve(dataDir, raw);
    if (isValidGgufFile(abs)) return abs;
    if (isValidGgufFile(raw)) return resolve(raw);
  }
  return null;
}
