import fs from 'node:fs'
import path from 'node:path'
import { evaluateIntent, CONSTITUTION_VERSION } from './constitution/index.ts'
import { loadPersona } from './persona/index.ts'
import { addAllowlistEntry, loadAllowlist } from './allowlist/index.ts'
import { appendAudit, readAuditJsonl } from './audit/index.ts'
import { createSession, handleSessionEvent } from './session/index.ts'
import { rehearseScript } from './sandbox/index.ts'
import { addFriend, enrollIdentity, resolveIdentity } from './identity/index.ts'
import { compileThoughtTape, loadThoughtTape } from './compile/index.ts'
import { planInstall, planUninstall } from './install/macos.ts'
import { runTape } from './runtime/vm.ts'
import { defaultDataDir } from './paths.ts'

function print(msg: string): void {
  process.stdout.write(`${msg}\n`)
}

function fail(msg: string): never {
  process.stderr.write(`${msg}\n`)
  process.exitCode = 1
  throw new Error(msg)
}

function stripMeta(args: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-dir') {
      i += 1
      continue
    }
    out.push(args[i]!)
  }
  return out
}

function dataDirFromArgs(args: string[]): string {
  const idx = args.indexOf('--data-dir')
  if (idx >= 0 && args[idx + 1]) return args[idx + 1]
  return process.env.CURSOR_ROOTV2_DATA_DIR ?? defaultDataDir()
}

export async function runCli(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv
  const dataDir = dataDirFromArgs(argv)

  switch (cmd) {
    case 'init': {
      fs.mkdirSync(dataDir, { recursive: true })
      const persona = loadPersona()
      if (!persona.ok) fail(persona.error)
      fs.writeFileSync(
        path.join(dataDir, 'constitution-accept.json'),
        JSON.stringify(
          {
            acceptedAt: new Date().toISOString(),
            constitutionVersion: CONSTITUTION_VERSION,
            persona: persona.preamble,
          },
          null,
          2,
        ),
      )
      appendAudit(dataDir, { type: 'init', action: 'accept_constitution' })
      compileThoughtTape(dataDir)
      print(`Initialized data dir: ${dataDir}`)
      print(`Compiled thought tape: ${path.join(dataDir, '.rootv2')}`)
      return
    }
    case 'compile': {
      const compiled = compileThoughtTape(dataDir)
      print(
        JSON.stringify(
          {
            root: compiled.root,
            frames: compiled.frames.map((f) => ({ seq: f.seq, id: f.id, op: f.op, hash: f.hash.slice(0, 12) })),
            runtimePath: compiled.runtimePath,
          },
          null,
          2,
        ),
      )
      return
    }
    case 'think': {
      let tape = loadThoughtTape(dataDir)
      if (!tape) tape = compileThoughtTape(dataDir) && loadThoughtTape(dataDir)
      if (!tape) fail('compile produced no tape')
      const intentIdx = rest.indexOf('--intent')
      const intent = intentIdx >= 0 ? rest[intentIdx + 1] : stripMeta(rest).join(' ') || undefined
      const result = runTape(tape, { intent })
      print(JSON.stringify(result, null, 2))
      if (result.decision?.allowed === false) process.exitCode = 1
      return
    }
    case 'evaluate': {
      const text = stripMeta(rest).join(' ')
      print(JSON.stringify(evaluateIntent(text), null, 2))
      return
    }
    case 'allowlist': {
      const sub = rest[0]
      if (sub === 'add') {
        const id = rest[1]
        const argvPrefix = rest.includes('--argv') ? rest[rest.indexOf('--argv') + 1] : undefined
        const absolutePath = rest.includes('--path') ? rest[rest.indexOf('--path') + 1] : undefined
        if (!id) fail('usage: allowlist add <id> [--argv prefix] [--path /abs]')
        addAllowlistEntry(dataDir, { id, argvPrefix, absolutePath })
        print(JSON.stringify(loadAllowlist(dataDir), null, 2))
        return
      }
      print(JSON.stringify(loadAllowlist(dataDir), null, 2))
      return
    }
    case 'report-event': {
      const sessionId = rest[0]
      const type = rest[1]
      if (!sessionId || !type) fail('usage: report-event <sessionId> <type> [--host h] [--path p] [--children n] [--confidence c]')
      const host = rest.includes('--host') ? rest[rest.indexOf('--host') + 1] : undefined
      const touched = rest.includes('--path') ? rest[rest.indexOf('--path') + 1] : undefined
      const childCount = rest.includes('--children')
        ? Number(rest[rest.indexOf('--children') + 1])
        : undefined
      const confidence = rest.includes('--confidence')
        ? Number(rest[rest.indexOf('--confidence') + 1])
        : undefined
      const allowlisted = loadAllowlist(dataDir).entries.some((e) => e.id === sessionId)
      const session = createSession({
        id: sessionId,
        allowlisted,
        blockedPathPrefixes: [path.join(dataDir, '..')],
      })
      const result = handleSessionEvent({
        dataDir,
        session,
        event: { type, host, path: touched, childCount, confidence },
      })
      print(JSON.stringify(result, null, 2))
      return
    }
    case 'rehearse': {
      const sourcePath = rest[0]
      if (!sourcePath) fail('usage: rehearse <script.mjs> [--declare /path]')
      const declares: string[] = []
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '--declare' && rest[i + 1]) declares.push(rest[i + 1])
      }
      const source = fs.readFileSync(sourcePath, 'utf8')
      const result = await rehearseScript({ dataDir, source, declaredPaths: declares })
      print(JSON.stringify(result, null, 2))
      if (!result.ok) process.exitCode = 1
      return
    }
    case 'identity': {
      const sub = rest[0]
      if (sub === 'enroll') {
        const id = rest[1]
        const name = rest[2]
        if (!id || !name) fail('usage: identity enroll <id> <displayName>')
        enrollIdentity(dataDir, id, { displayName: name })
        print(`enrolled ${id}`)
        return
      }
      if (sub === 'friend') {
        const a = rest[1]
        const b = rest[2]
        if (!a || !b) fail('usage: identity friend <a> <b>')
        addFriend(dataDir, a, b)
        print(`friends ${a} <-> ${b}`)
        return
      }
      if (sub === 'resolve') {
        const viewer = rest[1]
        const subject = rest[2]
        if (!viewer || !subject) fail('usage: identity resolve <viewer> <subject>')
        print(JSON.stringify(resolveIdentity(dataDir, viewer, subject), null, 2))
        return
      }
      fail('usage: identity enroll|friend|resolve ...')
      return
    }
    case 'status': {
      const accepted = fs.existsSync(path.join(dataDir, 'constitution-accept.json'))
      const tape = loadThoughtTape(dataDir)
      print(
        JSON.stringify(
          {
            dataDir,
            constitutionAccepted: accepted,
            allowlist: loadAllowlist(dataDir).entries.length,
            auditEvents: readAuditJsonl(dataDir).length,
            thoughtTape: tape
              ? { frames: tape.frames.length, dir: path.join(dataDir, '.rootv2') }
              : null,
          },
          null,
          2,
        ),
      )
      return
    }
    case 'install': {
      const dryRun = rest.includes('--dry-run')
      const plan = planInstall()
      if (!plan.supported && !dryRun) {
        fail(`install is only supported on macOS (platform=${plan.platform}). Use --dry-run to inspect.`)
      }
      print(JSON.stringify({ dryRun, ...plan, plistContents: undefined, plistBytes: plan.plistContents.length }, null, 2))
      if (!dryRun && plan.supported) {
        fs.mkdirSync(plan.dataDir, { recursive: true })
        fs.mkdirSync(path.dirname(plan.plistPath), { recursive: true })
        fs.writeFileSync(plan.plistPath, plan.plistContents)
        print(`Wrote ${plan.plistPath}`)
      }
      return
    }
    case 'uninstall': {
      const dryRun = rest.includes('--dry-run')
      const plan = planUninstall()
      print(JSON.stringify({ dryRun, ...plan }, null, 2))
      if (!dryRun) {
        if (fs.existsSync(plan.plistPath)) fs.unlinkSync(plan.plistPath)
        if (rest.includes('--purge-data') && fs.existsSync(plan.dataDir)) {
          fs.rmSync(plan.dataDir, { recursive: true, force: true })
        }
      }
      return
    }
    case 'help':
    case undefined:
      print(`cursor-rootv2 <command>
  init | compile | think [--intent text] | evaluate <text> | allowlist | report-event | rehearse
  identity | status | install [--dry-run] | uninstall [--dry-run] [--purge-data]
Env: CURSOR_ROOTV2_DATA_DIR or --data-dir <path>`)
      return
    default:
      fail(`Unknown command: ${cmd}`)
  }
}
