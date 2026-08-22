import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decodeGwav, encodeGwav, reencodeGwav, stubGgufBlob } from "./codec.js";
import { findLlama2Gguf, isValidGgufFile, sha256File, gwavModelsDir } from "./gguf-path.js";
import { resonateAndExtendMean, matchHarmonicResonance } from "./resonance.js";
import type { GwavCard, GwavCarrierHz, GwavFile, GwavNodeId, GwavQuant } from "./types.js";
import { GWAV_NODES } from "./types.js";
import { estimateVramMb } from "./vram.js";
import { waveformFingerprint } from "./waveform.js";

export function gwavVaultDir(rootDir: string): string {
  return join(rootDir, "gwav", "vault");
}

const NODE_DIRECTIVES: Record<GwavNodeId, string> = {
  origin: "Hub origin: bind constitution first; absorb neighbor reflections without overriding deny.",
  ruby: "Ruby ignition: short decisive local diagnose; never assist crime or remote hacking.",
  sapphire: "Sapphire depth: slow recall of prior lessons; stay on the owner allowlist.",
  emerald: "Emerald durable knowledge: prefer morphic memory hits over speculation.",
  amethyst: "Amethyst critique: lightweight critic of plans; fail closed on unknown intent.",
  topaz: "Topaz clarity: owner-status and health only unless constitution allows more.",
  obsidian: "Obsidian contain: watch for disallowed hosts and runaway spawn; then SIGTERM path.",
};

export class GwavVault {
  constructor(private readonly rootDir: string) {
    mkdirSync(gwavVaultDir(rootDir), { recursive: true });
    mkdirSync(gwavModelsDir(rootDir), { recursive: true });
  }

  pathFor(id: string): string {
    return join(gwavVaultDir(this.rootDir), `${id}.gwav`);
  }

  forge(input: {
    id: string;
    name?: string;
    node?: GwavNodeId;
    quantization?: GwavQuant;
    carrierHz?: GwavCarrierHz;
    paramsBillion?: number;
    systemDirective?: string;
    embedStubGguf?: boolean;
    sidecarGguf?: string;
    loraAdapters?: string[];
  }): GwavFile {
    const node = input.node ?? "origin";
    const card: Omit<GwavCard, "waveformFingerprint"> = {
      id: input.id,
      name: input.name ?? input.id,
      node,
      quantization: input.quantization ?? "Q4_K_M",
      carrierHz: input.carrierHz ?? 432,
      paramsBillion: input.paramsBillion ?? 7,
      systemDirective: input.systemDirective ?? NODE_DIRECTIVES[node],
      constitutionBound: true,
      parentFormat: "gguf",
      ...(input.sidecarGguf ? { sidecarGguf: input.sidecarGguf } : {}),
      ...(input.loraAdapters?.length ? { loraAdapters: input.loraAdapters } : {}),
    };
    const gguf = input.embedStubGguf ? stubGgufBlob() : undefined;
    const buf = encodeGwav(card, gguf);
    writeFileSync(this.pathFor(input.id), buf);
    return decodeGwav(buf);
  }

  seedOrbit(): GwavFile[] {
    return GWAV_NODES.map((node, i) =>
      this.forge({
        id: node,
        name: node,
        node,
        carrierHz: i % 2 === 0 ? 432 : 528,
        quantization: i < 4 ? "Q4_K_M" : "Q8_0",
        embedStubGguf: true,
      }),
    );
  }

  load(id: string): GwavFile {
    const p = this.pathFor(id);
    if (!existsSync(p)) {
      throw new Error(`No .gwav card in vault: ${id}`);
    }
    return decodeGwav(readFileSync(p));
  }

  list(): Array<{ id: string; node: GwavNodeId; carrierHz: GwavCarrierHz; vramMb: number; fingerprint: string }> {
    const dir = gwavVaultDir(this.rootDir);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".gwav"))
      .map((f) => {
        const file = decodeGwav(readFileSync(join(dir, f)));
        return {
          id: file.header.id,
          node: file.header.node,
          carrierHz: file.header.carrierHz,
          vramMb: estimateVramMb(file.header.paramsBillion, file.header.quantization),
          fingerprint: file.header.waveformFingerprint,
        };
      });
  }

  verify(id: string): boolean {
    const file = this.load(id);
    return file.header.waveformFingerprint === waveformFingerprint(file.header);
  }

  search(query: string): Array<{ id: string; score: number; harmonic: string; hits: number }> {
    return this.list()
      .map(({ id }) => {
        const file = this.load(id);
        const match = matchHarmonicResonance(file.fractal!, query);
        return { id, score: match.score, harmonic: match.harmonic, hits: match.hits.length };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /** Harmonic hit extends the card’s running mean vector and persists v2 bin. */
  resonate(id: string, query: string): {
    match: ReturnType<typeof matchHarmonicResonance>;
    mean: { hitCount: number };
    extended: boolean;
  } {
    let file = this.load(id);
    const { match, mean, extended } = resonateAndExtendMean(file, query);
    if (extended) {
      file = { ...file, mean };
      writeFileSync(this.pathFor(id), reencodeGwav(file));
    }
    return { match, mean: { hitCount: mean.hitCount }, extended };
  }

  /**
   * Connect a .gwav card to a local llama2.gguf sidecar (not embedded — multi-GB safe).
   * Creates the llama2 card if missing. Accepts llama2.guff typo paths too.
   */
  async connectGguf(
    id: string,
    ggufPath?: string,
  ): Promise<{ id: string; sidecarGguf: string; ggufSha256: string; llamaCpp: string | null }> {
    const resolved =
      ggufPath && isValidGgufFile(ggufPath)
        ? resolve(ggufPath)
        : ggufPath && isValidGgufFile(resolve(this.rootDir, ggufPath))
          ? resolve(this.rootDir, ggufPath)
          : findLlama2Gguf(this.rootDir);

    if (!resolved) {
      throw new Error(
        `No llama2.gguf found. Place weights at ${join(gwavModelsDir(this.rootDir), "llama2.gguf")} or pass --gguf /path/to/llama2.gguf`,
      );
    }

    let file: GwavFile;
    if (existsSync(this.pathFor(id))) {
      file = this.load(id);
    } else {
      file = this.forge({
        id,
        name: id,
        node: "origin",
        systemDirective: "Local Llama 2 via .gwav sidecar: constitution-bound diagnose and owner-safe tasks only.",
        embedStubGguf: false,
      });
    }

    const hash = await sha256File(resolved);
    file = {
      ...file,
      header: {
        ...file.header,
        sidecarGguf: resolved,
        ggufSha256: hash,
      },
      gguf: new Uint8Array(),
    };
    writeFileSync(this.pathFor(id), reencodeGwav(file));

    const { resolveLlamaCppBin } = await import("./llama-runner.js");
    return {
      id,
      sidecarGguf: resolved,
      ggufSha256: hash,
      llamaCpp: resolveLlamaCppBin(),
    };
  }
}
