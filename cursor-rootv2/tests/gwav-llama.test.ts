import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLAMA2_ID,
  GwavVault,
  isValidGgufFile,
  promptGwav,
  stubGgufBlob,
} from "../src/gwav/index.js";

function tmp(): string {
  return join("/tmp", `gwav-llama-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

describe("gwav llama2.gguf connect", () => {
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
  });
});
