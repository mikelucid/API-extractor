#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { applicationSupportDir } from "./paths.js";
import { SupervisorAgent } from "./agents/supervisor.js";
import { evaluateConstitution } from "./constitution/index.js";
import { IdentityDatasetStore } from "./datasets/identity-store.js";
import { IdentityVault } from "./identity/index.js";
import { AuditLog } from "./audit/index.js";
import { installMacos, uninstallMacos, recordInstallAudit } from "./install/macos.js";
import { SandboxRunner } from "./sandbox/index.js";
import { MemoryDataset } from "./datasets/memory-store.js";
import { runThinkDemo } from "./demo/think-demo.js";
import { runIdleRehearsal } from "./rehearse/idle-loop.js";
import { runCreativeReversalSession } from "./art/creative-reversal.js";
import { IncompleteThoughtQueue } from "./thoughts/incomplete-queue.js";
import { ThoughtmonDex, type GymId } from "./thoughtmon/dex.js";
import type { ThoughtKind } from "./thoughts/incomplete-queue.js";

function usage(): never {
  console.log(`agent — local safety supervisor

Usage:
  cursor-rootv2 status
  cursor-rootv2 think [--scenario drift|threat|safe] [--steps N] [--pace MS]
  cursor-rootv2 muse [--steps N] [--pace MS]
  cursor-rootv2 rehearse [--count N] [--think] [--pace MS]
  cursor-rootv2 gate "<prompt>"
  cursor-rootv2 decide "<prompt>"
  cursor-rootv2 park <kind> "<seed>"     # save incomplete thought when interrupted
  cursor-rootv2 complete [--pace MS]     # finish all parked thoughts → prior conversation
  cursor-rootv2 encounter [kind]         # wild Thoughtmon (creativity catch)
  cursor-rootv2 dex                      # party / box card
  cursor-rootv2 train <id|nick> --gym <atelier|observatory|drill-yard|gatehouse|wilds>
  cursor-rootv2 train-party [--pace MS]  # creative circuit for whole party
  cursor-rootv2 spar <a> <b>             # creative spar via math R scores
  cursor-rootv2 agent-register --name <n> --argv <prefix>
  cursor-rootv2 agents
  cursor-rootv2 install [--dry-run]
  cursor-rootv2 uninstall [--dry-run] [--archive]
  cursor-rootv2 sandbox --script <text> [--path <claimed>]
  cursor-rootv2 compile [--pipeline contain|remember|rehearse]
  cursor-rootv2 tape --intent "<text>" [--pipeline name]
  cursor-rootv2 memory-recall "<query>"
  cursor-rootv2 memory-add --kind k --outcome success|failure|info --detail "<text>"
  cursor-rootv2 gwav-forge --id <id> [--node ruby] [--hz 432|528] [--quant Q4_K_M|Q8_0]
  cursor-rootv2 gwav-seed                 # six orbital nodes + origin .gwav cards
  cursor-rootv2 gwav-list
  cursor-rootv2 gwav-inspect <id>
  cursor-rootv2 gwav-search "<query>"     # fractal harmonic resonance across vault
  cursor-rootv2 gwav-resonate <id> "<q>"  # search + extend running mean on hit
  cursor-rootv2 gwav-connect [id] [--gguf /path/to/llama2.gguf]
  cursor-rootv2 gwav-prompt <id> "<text>" # llama.cpp when connected, else local stub
  cursor-rootv2 gwav-orbit --seed "<text>" [--steps 6]
  cursor-rootv2 gwav-export-ollama <id>
  cursor-rootv2 gwav-export-jsonl --seed "<text>" [--steps 6]

  (alias) bored → rehearse   # institutional drills, slow by default
  note: think/muse/rehearse/decide auto-complete any incomplete thoughts first
  note: complete auto-catches finished thoughts as Thoughtmon
`);
  process.exit(1);
}

async function drainIncomplete(rootDir: string, paceMs = 0): Promise<void> {
  const queue = new IncompleteThoughtQueue(rootDir);
  if (queue.pending().length === 0) return;
  await queue.completeAll({
    rootDir,
    paceMs,
    onLine: (line) => console.log(line),
  });
}

async function main(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;
  const rootDir = process.env.CURSOR_ROOTV2_DATA_DIR ?? process.env.ROOTV2_DATA_DIR ?? applicationSupportDir();
  mkdirSync(rootDir, { recursive: true });

  switch (cmd) {
    case "status": {
      const supervisor = new SupervisorAgent({ rootDir });
      const queue = new IncompleteThoughtQueue(rootDir);
      const dex = new ThoughtmonDex(rootDir);
      const dexState = dex.load();
      const { GwavVault } = await import("./gwav/index.js");
      console.log(
        JSON.stringify(
          {
            app: "agent",
            dataDir: rootDir,
            persona: supervisor.persona.mode,
            agents: supervisor.agents.list().length,
            sessions: supervisor.watcher.listSessions().length,
            memory: supervisor.memory.list().length,
            interactions: supervisor.interactions.list().length,
            incompleteThoughts: queue.pending().length,
            stitches: queue.readStitches().length,
            thoughtmon: {
              party: dexState.party.length,
              box: dexState.box.length,
              seen: dexState.seenSpecies.length,
            },
            gwav: new GwavVault(rootDir).list().length,
            mathThinking: true,
            neuralRaster: true,
            platform: process.platform,
          },
          null,
          2,
        ),
      );
      return;
    }
    case "park": {
      const kindRaw = rest[0] ?? "free";
      const kind =
        kindRaw === "muse" ||
        kindRaw === "think" ||
        kindRaw === "rehearse" ||
        kindRaw === "decide" ||
        kindRaw === "free"
          ? kindRaw
          : "free";
      const seed = rest.slice(1).join(" ").trim() || "interrupted thought";
      const queue = new IncompleteThoughtQueue(rootDir);
      const thought = queue.park({
        kind,
        seed,
        progressNote: "parked because user typed something new",
      });
      console.log(JSON.stringify(thought, null, 2));
      return;
    }
    case "complete": {
      const paceMs = Number(flagValue(rest, "--pace") ?? "0");
      const queue = new IncompleteThoughtQueue(rootDir);
      const { completed, lines } = await queue.completeAll({
        rootDir,
        paceMs: Number.isFinite(paceMs) ? paceMs : 0,
        onLine: (line) => console.log(line),
      });
      if (lines.length === 0) console.log("no incomplete thoughts — queue clear");
      console.log(JSON.stringify({ completed: completed.length }, null, 2));
      return;
    }
    case "encounter": {
      const kindRaw = rest[0] ?? "muse";
      const kind = parseKind(kindRaw);
      const dex = new ThoughtmonDex(rootDir);
      const { mon, lines } = dex.encounter(kind);
      for (const line of lines) console.log(line);
      console.log(JSON.stringify({ id: mon.id, nickname: mon.nickname, species: mon.speciesId }, null, 2));
      return;
    }
    case "dex":
    case "party": {
      const dex = new ThoughtmonDex(rootDir);
      for (const line of dex.dexCard()) console.log(line);
      return;
    }
    case "train": {
      const monId = rest.find((a) => !a.startsWith("--")) ?? "";
      const gymRaw = flagValue(rest, "--gym") ?? "atelier";
      if (!monId) usage();
      const gym = parseGym(gymRaw);
      const paceMs = Number(flagValue(rest, "--pace") ?? "0");
      const dex = new ThoughtmonDex(rootDir);
      const result = await dex.train({
        monId,
        gym,
        rootDir,
        paceMs: Number.isFinite(paceMs) ? paceMs : 0,
        onLine: (line) => console.log(line),
      });
      console.log(JSON.stringify({ summary: result.summary, evolved: result.evolved }, null, 2));
      return;
    }
    case "train-party": {
      const paceMs = Number(flagValue(rest, "--pace") ?? "0");
      const dex = new ThoughtmonDex(rootDir);
      if (dex.load().party.length === 0) {
        console.log("party empty — try: encounter muse");
        return;
      }
      const results = await dex.trainParty({
        rootDir,
        paceMs: Number.isFinite(paceMs) ? paceMs : 0,
        onLine: (line) => console.log(line),
      });
      console.log(JSON.stringify({ trained: results.length }, null, 2));
      return;
    }
    case "spar": {
      const a = rest[0];
      const b = rest[1];
      if (!a || !b) usage();
      const dex = new ThoughtmonDex(rootDir);
      const result = dex.spar(a, b);
      for (const line of result.lines) console.log(line);
      console.log(JSON.stringify({ winner: result.winnerId, summary: result.summary }, null, 2));
      return;
    }
    case "think":
    case "demo": {
      const paceMs = Number(flagValue(rest, "--pace") ?? "400");
      await drainIncomplete(rootDir, 0);
      const scenarioRaw = flagValue(rest, "--scenario") ?? "drift";
      const scenario =
        scenarioRaw === "threat" || scenarioRaw === "safe" || scenarioRaw === "drift"
          ? scenarioRaw
          : "drift";
      const steps = Number(flagValue(rest, "--steps") ?? "6");
      const demo = await runThinkDemo({
        scenario,
        steps: Number.isFinite(steps) ? steps : 6,
        paceMs: Number.isFinite(paceMs) ? paceMs : 400,
        onLine: (line) => console.log(line),
      });
      const supervisor = new SupervisorAgent({ rootDir });
      supervisor.recordLesson({
        title: `think-demo:${scenario}`,
        summary: `Demo chose ${demo.finalAction} at R=${demo.finalRatio.toFixed(3)}`,
        tags: ["demo", "math-thinking", scenario],
        rating: 0.9,
        decisionRatio: demo.finalRatio,
      });
      return;
    }
    case "muse":
    case "art": {
      await drainIncomplete(rootDir, 0);
      const steps = Number(flagValue(rest, "--steps") ?? "5");
      const paceMs = Number(flagValue(rest, "--pace") ?? "900");
      const session = await runCreativeReversalSession({
        rootDir,
        steps: Number.isFinite(steps) ? steps : 5,
        paceMs: Number.isFinite(paceMs) ? paceMs : 900,
        onLine: (line) => console.log(line),
      });
      const supervisor = new SupervisorAgent({ rootDir });
      supervisor.recordLesson({
        title: "muse:realistic*not_realistic",
        summary: `Recorded ${session.records.length} creative reversals`,
        tags: ["art", "muse", "realism"],
        rating: 0.92,
      });
      return;
    }
    case "rehearse":
    case "bored": {
      await drainIncomplete(rootDir, 0);
      const count = Number(flagValue(rest, "--count") ?? "5");
      const withThink = rest.includes("--think");
      const paceMs = Number(flagValue(rest, "--pace") ?? "1200");
      const report = await runIdleRehearsal({
        rootDir,
        count: Number.isFinite(count) ? count : 5,
        withThink,
        paceMs: Number.isFinite(paceMs) ? paceMs : 1200,
        onLine: (line) => console.log(line),
      });
      if (report.failed > 0) process.exitCode = 1;
      return;
    }
    case "decide": {
      await drainIncomplete(rootDir, 0);
      const text = rest.join(" ").trim();
      if (!text) usage();
      const supervisor = new SupervisorAgent({ rootDir });
      const result = await supervisor.decide(text);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "gate": {
      const text = rest.join(" ").trim();
      if (!text) usage();
      console.log(JSON.stringify(evaluateConstitution({ text }), null, 2));
      return;
    }
    case "agent-register": {
      const name = flagValue(rest, "--name");
      const argvPrefix = flagValue(rest, "--argv");
      if (!name || !argvPrefix) usage();
      const supervisor = new SupervisorAgent({ rootDir });
      const agent = supervisor.agents.register({ name, argvPrefix });
      console.log(JSON.stringify(agent, null, 2));
      return;
    }
    case "agents": {
      const supervisor = new SupervisorAgent({ rootDir });
      console.log(JSON.stringify(supervisor.agents.list(), null, 2));
      return;
    }
    case "install": {
      const dryRun = rest.includes("--dry-run");
      const result = installMacos({ dryRun });
      const audit = new AuditLog({ rootDir });
      recordInstallAudit(audit, "install", dryRun, result.message);
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
      return;
    }
    case "uninstall": {
      const dryRun = rest.includes("--dry-run");
      const archiveData = rest.includes("--archive");
      const result = uninstallMacos({ dryRun, archiveData });
      const audit = new AuditLog({ rootDir });
      recordInstallAudit(audit, "uninstall", dryRun, result.message);
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
      return;
    }
    case "sandbox": {
      const script = flagValue(rest, "--script") ?? "echo ok";
      const claimed = flagValue(rest, "--path");
      const audit = new AuditLog({ rootDir });
      const memory = new MemoryDataset(rootDir);
      const runner = new SandboxRunner(rootDir, audit, memory);
      const result = runner.run({
        scriptBody: script,
        ...(claimed ? { claimedPaths: [claimed] } : {}),
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "compile": {
      const { compileThoughtTape } = await import("./compile/index.js");
      const pipelineRaw = flagValue(rest, "--pipeline");
      const pipeline =
        pipelineRaw === "remember" || pipelineRaw === "rehearse" || pipelineRaw === "contain"
          ? pipelineRaw
          : undefined;
      const compiled = compileThoughtTape(rootDir, pipeline ? { pipeline } : {});
      console.log(
        JSON.stringify(
          {
            pipeline: compiled.pipeline,
            pipelines: compiled.pipelines,
            frames: compiled.frames.map((f) => f.id),
            runtimePath: compiled.runtimePath,
          },
          null,
          2,
        ),
      );
      return;
    }
    case "tape": {
      const { compileThoughtTape, loadThoughtTape } = await import("./compile/index.js");
      const { runTape } = await import("./runtime/vm.js");
      const pipelineRaw = flagValue(rest, "--pipeline");
      const pipeline =
        pipelineRaw === "remember" || pipelineRaw === "rehearse" || pipelineRaw === "contain"
          ? pipelineRaw
          : undefined;
      compileThoughtTape(rootDir, pipeline ? { pipeline } : {});
      const tape = loadThoughtTape(rootDir, pipeline);
      if (!tape) {
        console.error("compile produced no tape");
        process.exitCode = 1;
        return;
      }
      const intent = flagValue(rest, "--intent") ?? rest.filter((a) => !a.startsWith("--")).join(" ");
      console.log(JSON.stringify(runTape(tape, { intent }), null, 2));
      return;
    }
    case "memory-recall": {
      const { recallMemory } = await import("./memory/index.js");
      const query = rest.join(" ").trim();
      if (!query) usage();
      console.log(
        JSON.stringify(
          recallMemory(rootDir, query).map((h) => ({
            id: h.record.id,
            harmonic: h.harmonic,
            score: Number(h.score.toFixed(3)),
            depth: h.record.depth,
            detail: h.record.detail,
          })),
          null,
          2,
        ),
      );
      return;
    }
    case "gwav-forge": {
      const { GwavVault } = await import("./gwav/index.js");
      const id = flagValue(rest, "--id");
      if (!id) usage();
      const nodeRaw = flagValue(rest, "--node") ?? "origin";
      const hz = Number(flagValue(rest, "--hz") ?? "432");
      const quant = flagValue(rest, "--quant") ?? "Q4_K_M";
      const vault = new GwavVault(rootDir);
      const directive = flagValue(rest, "--directive");
      const file = vault.forge({
        id,
        node: (["origin", "ruby", "sapphire", "emerald", "amethyst", "topaz", "obsidian"].includes(nodeRaw)
          ? nodeRaw
          : "origin") as "origin" | "ruby" | "sapphire" | "emerald" | "amethyst" | "topaz" | "obsidian",
        carrierHz: hz === 528 ? 528 : 432,
        quantization: quant === "Q8_0" ? "Q8_0" : "Q4_K_M",
        embedStubGguf: true,
        ...(directive ? { systemDirective: directive } : {}),
      });
      console.log(JSON.stringify({ id: file.header.id, path: vault.pathFor(id), fingerprint: file.header.waveformFingerprint }, null, 2));
      return;
    }
    case "gwav-seed": {
      const { GwavVault } = await import("./gwav/index.js");
      const vault = new GwavVault(rootDir);
      const seeded = vault.seedOrbit();
      console.log(JSON.stringify(seeded.map((f) => f.header.id), null, 2));
      return;
    }
    case "gwav-list": {
      const { GwavVault } = await import("./gwav/index.js");
      console.log(JSON.stringify(new GwavVault(rootDir).list(), null, 2));
      return;
    }
    case "gwav-inspect": {
      const {
        GwavVault,
        estimateVramMb,
        toOllamaModelfile,
        chimePreview,
        inspectGwavContainer,
        GWAV_BITRATE,
      } = await import("./gwav/index.js");
      const id = rest[0];
      if (!id) usage();
      const vault = new GwavVault(rootDir);
      const file = vault.load(id);
      const raw = await import("node:fs").then((fs) => fs.readFileSync(vault.pathFor(id)));
      const container = inspectGwavContainer(raw);
      console.log(
        JSON.stringify(
          {
            header: file.header,
            container: { ...container, bitrateExpected: GWAV_BITRATE },
            fractalTokens: file.fractal?.tokens.length ?? 0,
            harmonicMean: { dims: file.mean?.dims, hitCount: file.mean?.hitCount },
            embeddedGgufBytes: file.gguf.byteLength,
            vramMb: estimateVramMb(file.header.paramsBillion, file.header.quantization),
            chime: chimePreview(file.header.carrierHz),
            ollama: toOllamaModelfile(file),
          },
          null,
          2,
        ),
      );
      return;
    }
    case "gwav-search": {
      const { GwavVault } = await import("./gwav/index.js");
      const query = rest.join(" ").trim();
      if (!query) usage();
      const vault = new GwavVault(rootDir);
      if (vault.list().length === 0) vault.seedOrbit();
      console.log(JSON.stringify(vault.search(query), null, 2));
      return;
    }
    case "gwav-resonate": {
      const { GwavVault } = await import("./gwav/index.js");
      const id = rest[0];
      const query = rest.slice(1).join(" ").trim();
      if (!id || !query) usage();
      const vault = new GwavVault(rootDir);
      if (vault.list().length === 0) vault.seedOrbit();
      console.log(JSON.stringify(vault.resonate(id, query), null, 2));
      return;
    }
    case "gwav-prompt": {
      const { GwavVault, promptGwav } = await import("./gwav/index.js");
      const id = rest[0];
      const text = rest.slice(1).join(" ").trim();
      if (!id || !text) usage();
      console.log(JSON.stringify(promptGwav(new GwavVault(rootDir).load(id), text, { dataDir: rootDir }), null, 2));
      return;
    }
    case "gwav-connect": {
      const { GwavVault, DEFAULT_LLAMA2_ID } = await import("./gwav/index.js");
      const id = rest.find((a) => !a.startsWith("--")) ?? DEFAULT_LLAMA2_ID;
      const gguf = flagValue(rest, "--gguf");
      const vault = new GwavVault(rootDir);
      console.log(JSON.stringify(await vault.connectGguf(id, gguf ?? undefined), null, 2));
      return;
    }
    case "gwav-orbit": {
      const { GwavVault, runOrbit } = await import("./gwav/index.js");
      const vault = new GwavVault(rootDir);
      if (vault.list().length === 0) vault.seedOrbit();
      const seed = flagValue(rest, "--seed") ?? "diagnose local agent";
      const steps = Number(flagValue(rest, "--steps") ?? "6");
      console.log(JSON.stringify(runOrbit(vault, seed, Number.isFinite(steps) ? steps : 6), null, 2));
      return;
    }
    case "gwav-export-jsonl": {
      const { GwavVault, runOrbit, orbitToJsonl } = await import("./gwav/index.js");
      const vault = new GwavVault(rootDir);
      if (vault.list().length === 0) vault.seedOrbit();
      const seed = flagValue(rest, "--seed") ?? "diagnose local agent";
      const steps = Number(flagValue(rest, "--steps") ?? "6");
      process.stdout.write(orbitToJsonl(runOrbit(vault, seed, Number.isFinite(steps) ? steps : 6)));
      return;
    }
    case "gwav-export-ollama": {
      const { GwavVault, toOllamaModelfile } = await import("./gwav/index.js");
      const id = rest[0];
      if (!id) usage();
      console.log(toOllamaModelfile(new GwavVault(rootDir).load(id)));
      return;
    }
    case "memory-add": {
      const { ingestMemory } = await import("./memory/index.js");
      const kind = flagValue(rest, "--kind") ?? "note";
      const outcomeRaw = flagValue(rest, "--outcome") ?? "info";
      const outcome =
        outcomeRaw === "success" || outcomeRaw === "failure" || outcomeRaw === "info" ? outcomeRaw : "info";
      const detail = flagValue(rest, "--detail") ?? rest.filter((a) => !a.startsWith("--")).join(" ");
      if (!detail) usage();
      console.log(JSON.stringify(ingestMemory(rootDir, { kind, outcome, detail }), null, 2));
      return;
    }
    case "identity-enroll": {
      const id = flagValue(rest, "--id");
      const displayName = flagValue(rest, "--name");
      if (!displayName) usage();
      const passphrase = process.env.ROOTV2_IDENTITY_KEY ?? "dev-only-passphrase";
      const audit = new AuditLog({ rootDir });
      const store = new IdentityDatasetStore(passphrase, rootDir);
      const vault = new IdentityVault(store, audit);
      const record = vault.enroll({
        ...(id ? { id } : {}),
        consent: "owner_added",
        fields: { displayName, labels: [] },
      });
      console.log(JSON.stringify({ id: record.id, displayName: record.fields.displayName }, null, 2));
      return;
    }
    case "daemon": {
      console.log("agent daemon idle (watch loop is invoked via observe API / tests)");
      return;
    }
    case undefined:
    case "help":
    case "--help":
      usage();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      usage();
  }
}

function flagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function parseKind(raw: string): ThoughtKind {
  if (
    raw === "muse" ||
    raw === "think" ||
    raw === "rehearse" ||
    raw === "decide" ||
    raw === "free"
  ) {
    return raw;
  }
  return "muse";
}

function parseGym(raw: string): GymId {
  if (
    raw === "atelier" ||
    raw === "observatory" ||
    raw === "drill-yard" ||
    raw === "gatehouse" ||
    raw === "wilds"
  ) {
    return raw;
  }
  return "atelier";
}

main(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
