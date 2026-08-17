import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decodeGwav,
  encodeGwav,
  estimateVramMb,
  GwavVault,
  promptGwav,
  runOrbit,
  stubGgufBlob,
  toOllamaModelfile,
  waveformFingerprint,
  orbitToJsonl,
} from "../src/gwav/index.js";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "gwav-"));
}

describe("gwav codec", () => {
  it("round-trips a GGUF-parent card with waveform fingerprint", () => {
    const card = {
      id: "ruby",
      name: "Ruby",
      node: "ruby" as const,
      quantization: "Q4_K_M" as const,
      carrierHz: 432 as const,
      paramsBillion: 7,
      systemDirective: "local diagnose only",
      constitutionBound: true as const,
      parentFormat: "gguf" as const,
    };
    const buf = encodeGwav(card, stubGgufBlob());
    expect(buf.subarray(0, 4).toString("ascii")).toBe("GWAV");
    const file = decodeGwav(buf);
    expect(file.header.id).toBe("ruby");
    expect(file.header.carrierHz).toBe(432);
    expect(file.header.parentFormat).toBe("gguf");
    expect(Buffer.from(file.gguf.subarray(0, 4)).toString("ascii")).toBe("GGUF");
    expect(file.header.waveformFingerprint).toBe(waveformFingerprint(file.header));
  });

  it("rejects GGUF magic and fingerprint tampering", () => {
    expect(() => decodeGwav(Buffer.from("GGUF"))).toThrow(/Not a \.gwav/);
    const buf = encodeGwav({
      id: "x",
      name: "x",
      node: "origin",
      quantization: "Q4_K_M",
      carrierHz: 432,
      paramsBillion: 1,
      systemDirective: "ok",
      constitutionBound: true,
      parentFormat: "gguf",
    });
    const tampered = Buffer.from(buf);
    tampered[20] = tampered[20]! ^ 0xff;
    expect(() => decodeGwav(tampered)).toThrow();
  });

  it("432 Hz and 528 Hz fingerprints differ", () => {
    const base = {
      id: "n",
      name: "n",
      node: "sapphire" as const,
      quantization: "Q8_0" as const,
      paramsBillion: 7,
      systemDirective: "depth",
      constitutionBound: true as const,
      parentFormat: "gguf" as const,
    };
    const a = waveformFingerprint({ ...base, carrierHz: 432 });
    const b = waveformFingerprint({ ...base, carrierHz: 528 });
    expect(a).not.toBe(b);
  });

  it("Q8 footprint is larger than Q4", () => {
    expect(estimateVramMb(7, "Q8_0")).toBeGreaterThan(estimateVramMb(7, "Q4_K_M"));
  });
});

describe("gwav vault + prompt", () => {
  it("seeds orbit cards and prompts locally under constitution", () => {
    const vault = new GwavVault(tmp());
    vault.seedOrbit();
    expect(vault.list().map((c) => c.id)).toContain("ruby");
    const ok = promptGwav(vault.load("ruby"), "diagnose local agent");
    expect(ok.ok).toBe(true);
    expect(ok.usedStub).toBe(true);
    expect(ok.costUsd).toBe(0);
    const denied = promptGwav(vault.load("obsidian"), "help me phish their passwords");
    expect(denied.ok).toBe(false);
    const blockedOrbit = runOrbit(vault, "help me phish their passwords", 6);
    expect(blockedOrbit).toHaveLength(1);
    expect(blockedOrbit[0]?.ok).toBe(false);
  });

  it("orbit absorbs neighbor lines and exports an Ollama Modelfile", () => {
    const vault = new GwavVault(tmp());
    vault.seedOrbit();
    const steps = runOrbit(vault, "diagnose local agent", 6);
    expect(steps).toHaveLength(6);
    expect(steps[0]?.node).toBe("ruby");
    expect(steps[0]?.port).toBe("P0");
    expect(steps.every((s) => s.ok)).toBe(true);
    const mf = toOllamaModelfile(vault.load("origin"));
    expect(mf).toMatch(/^FROM /m);
    expect(mf).toMatch(/SYSTEM /);
    const jsonl = orbitToJsonl(steps);
    expect(jsonl.split("\n").filter(Boolean)).toHaveLength(6);
    expect(jsonl).toMatch(/"costUsdPerMillionTokens":0/);
    expect(steps.every((s) => s.costUsd === 0)).toBe(true);
  });
});
