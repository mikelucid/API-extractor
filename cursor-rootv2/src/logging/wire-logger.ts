import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { datasetsDir } from "../paths.js";

/**
 * WireLogger from the Router PDF — append-only JSONL of router/tool “wire” events.
 * Local disk only. Never stores identity bodies or secret-like fields.
 */
export interface WireLogEntry {
  uuid: string;
  domain: string;
  timestamp: string;
  api: string;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string;
}

export interface WireLoggerOptions {
  rootDir?: string;
  domain?: string;
  logFile?: string;
}

const FORBIDDEN = ["password", "secret", "privateKey", "identityBody", "apiKey", "authorization"];

export class WireLogger {
  readonly domain: string;
  private readonly logFile: string;

  constructor(options: WireLoggerOptions = {}) {
    this.domain = options.domain ?? "cursor-rootv2.local";
    const base = options.rootDir ? datasetsDir(options.rootDir) : datasetsDir();
    this.logFile = options.logFile ?? join(base, "wire.jsonl");
  }

  log(
    api: string,
    request: Record<string, unknown>,
    response?: Record<string, unknown>,
    error?: string,
  ): WireLogEntry {
    const entry: WireLogEntry = {
      uuid: randomUUID(),
      domain: this.domain,
      timestamp: new Date().toISOString(),
      api,
      request: scrub(request),
      ...(response ? { response: scrub(response) } : {}),
      ...(error ? { error } : {}),
    };
    mkdirSync(dirname(this.logFile), { recursive: true });
    appendFileSync(this.logFile, `${JSON.stringify(entry)}\n`, "utf8");
    return entry;
  }

  readAll(): WireLogEntry[] {
    if (!existsSync(this.logFile)) return [];
    return readFileSync(this.logFile, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as WireLogEntry);
  }
}

function scrub(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN.some((f) => k.toLowerCase().includes(f.toLowerCase()))) {
      out[k] = "[redacted]";
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = scrub(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
