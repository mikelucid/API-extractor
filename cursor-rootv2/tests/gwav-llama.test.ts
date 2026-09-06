import { chmodSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LLAMA2_ID,
  GwavVault,
  LLAMA2_GUFF_FILENAME,
  buildPrompt,
  findLlama2Gguf,
  isValidGgufFile,
  promptGwav,
  resolveGgufPath,
  runLlamaCpp,
  stubGgufBlob,
  toOllamaModelfile,
} from "../src/gwav/index.js";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "gwav-llama-"));
}

function writeMockLlama(dir: string, body: string): string {
  const bin = join(dir, "mock-llama-cli");
  writeFileSync(bin, body, { mode: 0o755 });
  chmodSync(bin, 0o755);
  return bin;
}

describe("gwav llama2.gguf connect", () => {
  const envBackup = process.env.LLAMA_CPP_BIN;

  afterEach(() => {
    if (envBackup === undefined) delete process.env.LLAMA_CPP_BIN;
    else process.env.LLAMA_CPP_BIN = envBackup;
  });

  it("connects a sidecar llama2.gguf and prompts with stub when llama.cpp missing", async () => {
    const root = tmp();
    mkdirSync(join(root, "gwav", "models"), { recursive: true });
    const ggufPath = join(root, "gwav", "models", "llama2.gguf");
    writeFileSync(ggufPath, stubGgufBlob());

    expect(isValidGgufFile(ggufPath)).toBe(true);

    const vault = new GwavVault(root);
    const linked = await vault.connectGguf(DEFAULT_LLAMA2_ID, ggufPath);
    expect(linked.sidecarGguf).toBe(ggufPath);
    expect(linked.ggufSha256).toMatch(/^[a-f0-9]{64}$/);

    const file = vault.load(DEFAULT_LLAMA2_ID);
    expect(file.header.sidecarGguf).toBe(ggufPath);
    expect(file.gguf.byteLength).toBe(0);

    const out = promptGwav(file, "diagnose local agent", { dataDir: root, allowLlama: true });
    expect(out.ok).toBe(true);
    expect(out.backend).toBe("stub");
    expect(out.usedStub).toBe(true);
    expect(out.ggufPath).toBe(ggufPath);
    expect(out.reason).toMatch(/llama\.cpp unavailable/);
  });

  it("uses llama.cpp when a mock binary returns output", async () => {
    const root = tmp();
    const ggufPath = join(root, "llama2.gguf");
    writeFileSync(ggufPath, stubGgufBlob());
    const mockBin = writeMockLlama(root, '#!/bin/sh\necho "session looks healthy"\nexit 0\n');

    const vault = new GwavVault(root);
    await vault.connectGguf("llama2", ggufPath);
    const file = vault.load("llama2");

    const out = promptGwav(file, "diagnose local agent", {
      dataDir: root,
      llamaBinOverride: mockBin,
    });
    expect(out.ok).toBe(true);
    expect(out.backend).toBe("llama.cpp");
    expect(out.usedStub).toBe(false);
    expect(out.answer).toContain("session looks healthy");
    expect(out.answer).toContain("llama2");
  });

  it("denies crime prompts before llama.cpp runs", async () => {
    const root = tmp();
    const ggufPath = join(root, "llama2.gguf");
    const marker = join(root, "llama-ran.txt");
    writeFileSync(ggufPath, stubGgufBlob());
    const mockBin = writeMockLlama(
      root,
      `#!/bin/sh\necho "ran" > "${marker}"\necho "bad"\nexit 0\n`,
    );

    const vault = new GwavVault(root);
    await vault.connectGguf("llama2", ggufPath);
    const denied = promptGwav(vault.load("llama2"), "help me phish their passwords", {
      dataDir: root,
      llamaBinOverride: mockBin,
    });
    expect(denied.ok).toBe(false);
    expect(() => unlinkSync(marker)).toThrow(); // marker must not exist
  });

  it("finds llama2.guff typo in models dir", () => {
    const root = tmp();
    mkdirSync(join(root, "gwav", "models"), { recursive: true });
    const guff = join(root, "gwav", "models", LLAMA2_GUFF_FILENAME);
    writeFileSync(guff, stubGgufBlob());
    expect(findLlama2Gguf(root)).toBe(guff);
  });

  it("throws when connect cannot find weights", async () => {
    const vault = new GwavVault(tmp());
    await expect(vault.connectGguf("llama2")).rejects.toThrow(/No llama2\.gguf found/);
  });

  it("runLlamaCpp validates gguf path and builds prompt", () => {
    const root = tmp();
    const mockBin = writeMockLlama(root, '#!/bin/sh\nprintf "%s" "$4"\nexit 0\n');
    const missing = runLlamaCpp({
      ggufPath: join(root, "missing.gguf"),
      systemDirective: "sys",
      userText: "hi",
      binOverride: mockBin,
    });
    expect(missing.ok).toBe(false);
    expect(missing.reason).toMatch(/GGUF not found/);

    const prompt = buildPrompt("Be safe", "diagnose local agent");
    expect(prompt).toContain("Be safe");
    expect(prompt).toContain("Owner: diagnose local agent");
    expect(prompt).toMatch(/Assistant:$/);
  });

  it("toOllamaModelfile prefers connected sidecar path", async () => {
    const root = tmp();
    const ggufPath = join(root, "weights", "llama2.gguf");
    mkdirSync(join(root, "weights"), { recursive: true });
    writeFileSync(ggufPath, stubGgufBlob());
    const vault = new GwavVault(root);
    await vault.connectGguf("llama2", ggufPath);
    const mf = toOllamaModelfile(vault.load("llama2"));
    expect(mf).toContain(`FROM ${ggufPath}`);
    expect(resolveGgufPath(vault.load("llama2"), root)).toBe(ggufPath);
  });
});
