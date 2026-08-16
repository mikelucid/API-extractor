import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { memoryDatasetPath } from "../paths.js";
import {
  datasetMeta,
  newMemoryId,
  type MemoryLessonRecord,
} from "./schemas.js";

export class MemoryDataset {
  private readonly path: string;
  private records: MemoryLessonRecord[] = [];

  constructor(rootDir?: string) {
    this.path = memoryDatasetPath(rootDir);
    this.load();
  }

  private load(): void {
    if (!existsSync(this.path)) {
      this.records = [];
      return;
    }
    this.records = readFileSync(this.path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as MemoryLessonRecord);
  }

  list(): MemoryLessonRecord[] {
    return [...this.records];
  }

  append(input: Omit<MemoryLessonRecord, "id" | "at"> & { id?: string; at?: string }): MemoryLessonRecord {
    assertNoSecrets(input);
    const record: MemoryLessonRecord = {
      ...input,
      id: input.id ?? newMemoryId(),
      at: input.at ?? new Date().toISOString(),
    };
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, `${JSON.stringify(record)}\n`, "utf8");
    this.records.push(record);
    return record;
  }

  findByTag(tag: string): MemoryLessonRecord[] {
    return this.records.filter((r) => r.tags.includes(tag));
  }

  /** Rewrite file atomically for tests/migrations. */
  replaceAll(records: MemoryLessonRecord[]): void {
    for (const r of records) assertNoSecrets(r);
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(
      this.path,
      records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""),
      "utf8",
    );
    this.records = [...records];
  }

  meta() {
    return datasetMeta("memory");
  }
}

const FORBIDDEN_KEYS = ["password", "secret", "privateKey", "identityBody", "ssn"];

function assertNoSecrets(record: object): void {
  const json = JSON.stringify(record).toLowerCase();
  for (const key of FORBIDDEN_KEYS) {
    if (json.includes(`"${key.toLowerCase()}"`)) {
      throw new Error(`Memory dataset refuses secret-like field: ${key}`);
    }
  }
}
