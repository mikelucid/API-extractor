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
