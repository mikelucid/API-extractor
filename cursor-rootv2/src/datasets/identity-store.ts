import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { identityDatasetPath } from "../paths.js";
import {
  datasetMeta,
  newIdentityId,
  type IdentityProfileFields,
  type IdentityRecord,
  type IdentityVaultDataset,
} from "./schemas.js";

interface SealedFile {
  meta: ReturnType<typeof datasetMeta>;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

export class IdentityDatasetStore {
  private readonly path: string;
  private readonly salt: Buffer;
  private readonly key: Buffer;
  private records: IdentityRecord[] = [];

  constructor(passphrase: string, rootDir?: string) {
    this.path = identityDatasetPath(rootDir);
    this.salt = this.loadOrCreateSalt();
    this.key = scryptSync(passphrase, this.salt, 32);
    this.load();
  }

  private loadOrCreateSalt(): Buffer {
    if (existsSync(this.path)) {
      const sealed = JSON.parse(readFileSync(this.path, "utf8")) as SealedFile;
      return Buffer.from(sealed.salt, "base64");
    }
    return randomBytes(16);
  }

  private load(): void {
    if (!existsSync(this.path)) {
      this.records = [];
      return;
    }
    const sealed = JSON.parse(readFileSync(this.path, "utf8")) as SealedFile;
    const iv = Buffer.from(sealed.iv, "base64");
    const tag = Buffer.from(sealed.tag, "base64");
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    const plain =
      decipher.update(Buffer.from(sealed.ciphertext, "base64"), undefined, "utf8") +
      decipher.final("utf8");
    const parsed = JSON.parse(plain) as IdentityVaultDataset;
    this.records = parsed.records;
  }

  private persist(): void {
    const payload: IdentityVaultDataset = {
      meta: datasetMeta("identity"),
      records: this.records,
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const sealed: SealedFile = {
      meta: datasetMeta("identity"),
      salt: this.salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(sealed, null, 2), "utf8");
  }

  listIds(): string[] {
    return this.records.map((r) => r.id);
  }

  enroll(input: {
    id?: string;
    consent: IdentityRecord["consent"];
    fields: IdentityProfileFields;
    friendIds?: string[];
  }): IdentityRecord {
    const record: IdentityRecord = {
      id: input.id ?? newIdentityId(),
      enrolledAt: new Date().toISOString(),
      consent: input.consent,
      fields: input.fields,
      friendIds: input.friendIds ?? [],
    };
    this.records.push(record);
    this.persist();
    return record;
  }

  get(id: string): IdentityRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  addFriendship(a: string, b: string): void {
    const left = this.get(a);
    const right = this.get(b);
    if (!left || !right) throw new Error("Both identities must be enrolled before friending");
    if (!left.friendIds.includes(b)) left.friendIds.push(b);
    if (!right.friendIds.includes(a)) right.friendIds.push(a);
    this.persist();
  }

  areMutualFriends(a: string, b: string): boolean {
    const left = this.get(a);
    const right = this.get(b);
    if (!left || !right) return false;
    return left.friendIds.includes(b) && right.friendIds.includes(a);
  }

  resolve(
    requesterId: string,
    subjectId: string,
    fields: Array<keyof IdentityProfileFields>,
  ): { allowed: boolean; data?: Partial<IdentityProfileFields>; reason: string } {
    if (requesterId === subjectId) {
      const self = this.get(subjectId);
      if (!self) return { allowed: false, reason: "Subject not enrolled" };
      return { allowed: true, data: pickFields(self.fields, fields), reason: "Self access" };
    }
    if (!this.areMutualFriends(requesterId, subjectId)) {
      return { allowed: false, reason: "Friends-only ACL denied (not mutual friends)" };
    }
    const subject = this.get(subjectId);
    if (!subject) return { allowed: false, reason: "Subject not enrolled" };
    return {
      allowed: true,
      data: pickFields(subject.fields, fields),
      reason: "Mutual friend ACL allowed",
    };
  }
}

function pickFields(
  fields: IdentityProfileFields,
  keys: Array<keyof IdentityProfileFields>,
): Partial<IdentityProfileFields> {
  const out: Partial<IdentityProfileFields> = {};
  for (const key of keys) {
    const value = fields[key];
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}
