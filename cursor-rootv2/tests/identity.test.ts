import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AuditLog } from "../src/audit/index.js";
import { IdentityDatasetStore } from "../src/datasets/identity-store.js";
import { IdentityVault } from "../src/identity/index.js";

describe("friend-gated identity", () => {
  it("denies non-friend identity resolve", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-acl-"));
    const audit = new AuditLog({ rootDir: root });
    const store = new IdentityDatasetStore("pass", root);
    const vault = new IdentityVault(store, audit);

    vault.enroll({
      id: "idn_alice",
      consent: "self_enrolled",
      fields: { displayName: "Alice", labels: [] },
    });
    vault.enroll({
      id: "idn_carol",
      consent: "owner_added",
      fields: { displayName: "Carol", labels: [] },
    });

    const result = vault.resolve("idn_carol", "idn_alice", ["displayName"]);
    expect(result.allowed).toBe(false);
    expect(result.data).toBeUndefined();

    const access = audit.readAll().find((e) => e.kind === "identity_access");
    expect(access?.kind).toBe("identity_access");
    if (access?.kind === "identity_access") {
      expect(access.allowed).toBe(false);
      expect(JSON.stringify(access)).not.toMatch(/Alice/);
    }
  });

  it("allows mutual friends to receive fields", () => {
    const root = mkdtempSync(join(tmpdir(), "rootv2-acl-ok-"));
    const audit = new AuditLog({ rootDir: root });
    const store = new IdentityDatasetStore("pass", root);
    const vault = new IdentityVault(store, audit);

    vault.enroll({
      id: "idn_alice",
      consent: "self_enrolled",
      fields: { displayName: "Alice", labels: ["lab"], notes: "ok" },
    });
    vault.enroll({
      id: "idn_bob",
      consent: "owner_added",
      fields: { displayName: "Bob", labels: [] },
    });
    vault.addFriendship("idn_alice", "idn_bob");

    const result = vault.resolve("idn_bob", "idn_alice", ["displayName", "labels"]);
    expect(result.allowed).toBe(true);
    expect(result.data?.displayName).toBe("Alice");
    expect(result.data?.labels).toEqual(["lab"]);
  });

  it("does not expose stranger/auto-discover APIs", () => {
    expect(IdentityVault.unsupportedApis()).toEqual({
      scrapeInternetIdentities: false,
      silentBiometricMatch: false,
      autoDiscoverStrangers: false,
    });
  });
});
