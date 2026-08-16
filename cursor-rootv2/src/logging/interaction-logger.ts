import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { datasetsDir } from "../paths.js";

/**
 * InteractionLogger from the AI API Router PDF (pre- / post-decentral cleanup).
 * Local JSON only — no torrent/DHT transfer.
 */
export interface InteractionEntry {
  uuid: string;
  domain: string;
  timestamp: string;
  userId: string;
  groupId: string;
  topic: string;
  request: string;
  bestAnswer: string;
  apiUsed: string;
  rating: number;
  tags: string[];
}

export interface InteractionLoggerOptions {
  rootDir?: string;
  domain?: string;
  logFile?: string;
}

export class InteractionLogger {
  readonly domain: string;
  private readonly logFile: string;
  private entries: InteractionEntry[] = [];

  constructor(options: InteractionLoggerOptions = {}) {
    this.domain = options.domain ?? "cursor-rootv2.local";
    const base = options.rootDir ? datasetsDir(options.rootDir) : datasetsDir();
    this.logFile = options.logFile ?? join(base, "interactions.json");
    this.load();
  }

  private load(): void {
    if (!existsSync(this.logFile)) {
      this.entries = [];
      return;
    }
    const parsed = JSON.parse(readFileSync(this.logFile, "utf8")) as {
      entries: InteractionEntry[];
    };
    this.entries = parsed.entries ?? [];
  }

  private save(): void {
    mkdirSync(dirname(this.logFile), { recursive: true });
    writeFileSync(
      this.logFile,
      JSON.stringify({ entries: this.entries }, null, 2),
      "utf8",
    );
  }

  addEntry(input: {
    userId?: string;
    groupId?: string;
    topic: string;
    request: string;
    bestAnswer: string;
    apiUsed: string;
    rating?: number;
    tags?: string[];
    uuid?: string;
  }): InteractionEntry {
    const entry: InteractionEntry = {
      uuid: input.uuid ?? randomUUID(),
      domain: this.domain,
      timestamp: new Date().toISOString(),
      userId: input.userId ?? "owner",
      groupId: input.groupId ?? "local",
      topic: input.topic,
      request: input.request,
      bestAnswer: truncate(input.bestAnswer, 2000),
      apiUsed: input.apiUsed,
      rating: input.rating ?? 1,
      tags: input.tags ?? [],
    };
    this.entries.push(entry);
    this.save();
    return entry;
  }

  list(): InteractionEntry[] {
    return [...this.entries];
  }

  getEntriesByUser(userId: string): InteractionEntry[] {
    return this.entries.filter((e) => e.userId === userId);
  }

  getEntriesByGroup(groupId: string): InteractionEntry[] {
    return this.entries.filter((e) => e.groupId === groupId);
  }

  getEntriesByTopic(topic: string): InteractionEntry[] {
    const needle = topic.toLowerCase();
    return this.entries.filter((e) => e.topic.toLowerCase().includes(needle));
  }

  /**
   * Ranked retrieval — rating × mild recency (resurrected after PDF called rating “redundant”).
   */
  getTopAnswer(
    topic: string,
    weightBy: "rating" | "recency" | "rating_recency" = "rating_recency",
  ): InteractionEntry | undefined {
    const candidates = this.getEntriesByTopic(topic);
    if (candidates.length === 0) return undefined;
    const now = Date.now();
    return [...candidates].sort((a, b) => {
      const score = (e: InteractionEntry) => {
        const ageHours = Math.max(0, (now - Date.parse(e.timestamp)) / 3_600_000);
        const recency = 1 / (1 + ageHours / 24);
        switch (weightBy) {
          case "rating":
            return e.rating;
          case "recency":
            return recency;
          case "rating_recency":
            return e.rating * (0.5 + 0.5 * recency);
          default: {
            const _never: never = weightBy;
            void _never;
            return e.rating;
          }
        }
      };
      return score(b) - score(a);
    })[0];
  }
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
