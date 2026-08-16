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

function usage(): never {
  console.log(`cursor-rootv2 — local safety supervisor

Usage:
  cursor-rootv2 status
  cursor-rootv2 think [--scenario drift|threat|safe] [--steps N] [--pace MS]
  cursor-rootv2 muse [--steps N] [--pace MS]
  cursor-rootv2 rehearse [--count N] [--think] [--pace MS]
  cursor-rootv2 gate "<prompt>"
  cursor-rootv2 decide "<prompt>"
  cursor-rootv2 park <kind> "<seed>"     # save incomplete thought when interrupted
  cursor-rootv2 complete [--pace MS]     # finish all parked thoughts → prior conversation
  cursor-rootv2 agent-register --name <n> --argv <prefix>
  cursor-rootv2 agents
  cursor-rootv2 install [--dry-run]
  cursor-rootv2 uninstall [--dry-run] [--archive]
  cursor-rootv2 sandbox --script <text> [--path <claimed>]

  (alias) bored → rehearse   # institutional drills, slow by default
  note: think/muse/rehearse/decide auto-complete any incomplete thoughts first
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
  const rootDir = process.env.ROOTV2_DATA_DIR ?? applicationSupportDir();
  mkdirSync(rootDir, { recursive: true });

  switch (cmd) {
    case "status": {
      const supervisor = new SupervisorAgent({ rootDir });
      const queue = new IncompleteThoughtQueue(rootDir);
      console.log(
        JSON.stringify(
          {
            app: "cursor-rootv2",
            dataDir: rootDir,
            persona: supervisor.persona.mode,
            agents: supervisor.agents.list().length,
            sessions: supervisor.watcher.listSessions().length,
            memory: supervisor.memory.list().length,
            interactions: supervisor.interactions.list().length,
            incompleteThoughts: queue.pending().length,
            stitches: queue.readStitches().length,
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
      console.log("cursor-rootv2 daemon idle (watch loop is invoked via observe API / tests)");
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

main(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
