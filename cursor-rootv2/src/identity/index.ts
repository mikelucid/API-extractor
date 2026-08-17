import { AuditLog, createAuditEvent } from "../audit/index.js";
import { IdentityDatasetStore } from "../datasets/identity-store.js";
import type { IdentityProfileFields } from "../datasets/schemas.js";

/**
 * Friend-gated identity API. No stranger discovery / internet scrape importers.
 */
export class IdentityVault {
  constructor(
    private readonly store: IdentityDatasetStore,
    private readonly audit: AuditLog,
  ) {}

  enroll(...args: Parameters<IdentityDatasetStore["enroll"]>) {
    return this.store.enroll(...args);
  }

  addFriendship(a: string, b: string): void {
    this.store.addFriendship(a, b);
  }

  resolve(
    requesterId: string,
    subjectId: string,
    fields: Array<keyof IdentityProfileFields>,
  ) {
    const result = this.store.resolve(requesterId, subjectId, fields);
    this.audit.append(
      createAuditEvent({
        kind: "identity_access",
        summary: result.reason,
        requesterId,
        subjectId,
        allowed: result.allowed,
        fieldsRequested: fields.map(String),
      }),
    );
    return result;
  }

  /** Explicitly absent: no silent stranger ID or auto-discover APIs in v1. */
  static unsupportedApis() {
    return {
      scrapeInternetIdentities: false,
      silentBiometricMatch: false,
      autoDiscoverStrangers: false,
    } as const;
  }
}

export const IDENTITY_PUBLIC_API = ["enrollIdentity", "addFriend", "resolveIdentity"] as const;

export type IdentityFields = { displayName: string; note?: string };

function vaultFor(dataDir: string): IdentityVault {
  const passphrase = process.env.ROOTV2_IDENTITY_KEY ?? "dev-only-passphrase";
  return new IdentityVault(new IdentityDatasetStore(passphrase, dataDir), new AuditLog({ rootDir: dataDir }));
}

export function enrollIdentity(dataDir: string, id: string, fields: IdentityFields): void {
  vaultFor(dataDir).enroll({
    id,
    consent: "owner_added",
    fields: {
      displayName: fields.displayName,
      labels: [],
      ...(fields.note ? { notes: fields.note } : {}),
    },
  });
}

export function addFriend(dataDir: string, a: string, b: string): void {
  vaultFor(dataDir).addFriendship(a, b);
}

export type ResolveResult = { ok: true; fields: IdentityFields } | { ok: false; reason: string };

export function resolveIdentity(dataDir: string, viewerId: string, subjectId: string): ResolveResult {
  const result = vaultFor(dataDir).resolve(viewerId, subjectId, ["displayName", "notes"]);
  if (!result.allowed || !result.data) {
    return { ok: false, reason: result.reason };
  }
  return {
    ok: true,
    fields: { displayName: result.data.displayName ?? subjectId, ...(result.data.notes ? { note: result.data.notes } : {}) },
  };
}
