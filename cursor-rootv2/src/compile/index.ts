import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compiledRoot, compiledSequenceDir } from '../paths.ts'
import { assertChainLinks, THOUGHT_CHAIN } from '../thoughts/chain.ts'
import { TAPE_MAGIC, type CompiledFrame, type ThoughtTape } from '../thoughts/types.ts'

export type CompileResult = {
  root: string
  sequenceDir: string
  tapePath: string
  runtimePath: string
  frames: CompiledFrame[]
}

function hashPayload(payload: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function compileThoughtTape(dataDir: string, now = new Date()): CompileResult {
  assertChainLinks()
  const root = compiledRoot(dataDir)
  const sequenceDir = compiledSequenceDir(dataDir)
  fs.rmSync(sequenceDir, { recursive: true, force: true })
  fs.mkdirSync(sequenceDir, { recursive: true })

  const frames: CompiledFrame[] = THOUGHT_CHAIN.map((thought) => {
    const compiled = thought.compile()
    return { ...compiled, hash: hashPayload(compiled.payload) }
  })

  for (const frame of frames) {
    const name = `${String(frame.seq).padStart(3, '0')}-${frame.id}.frame.json`
    fs.writeFileSync(path.join(sequenceDir, name), `${JSON.stringify(frame, null, 2)}\n`)
  }

  const tape: ThoughtTape = {
    magic: TAPE_MAGIC,
    version: 1,
    compiledAt: now.toISOString(),
    frames,
  }
  const tapePath = path.join(root, 'tape.json')
  fs.writeFileSync(tapePath, `${JSON.stringify(tape, null, 2)}\n`)

  const runtimePath = path.join(root, 'runtime.mjs')
  fs.writeFileSync(runtimePath, renderRuntimeMjs())
  fs.chmodSync(runtimePath, 0o755)

  return { root, sequenceDir, tapePath, runtimePath, frames }
}

export function loadThoughtTape(dataDir: string): ThoughtTape | null {
  const tapePath = path.join(compiledRoot(dataDir), 'tape.json')
  if (!fs.existsSync(tapePath)) return null
  return JSON.parse(fs.readFileSync(tapePath, 'utf8')) as ThoughtTape
}

function interpreterSource(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return fs.readFileSync(path.join(here, '../runtime/interpreter.js'), 'utf8')
}

/** Different-looking executable: generic tape stepper, not thought source. */
export function renderRuntimeMjs(): string {
  return `#!/usr/bin/env node
/* ROOTV2 generated thought-tape runtime — stepper, not source thoughts */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

${interpreterSource()}

const here = dirname(fileURLToPath(import.meta.url))
const tape = JSON.parse(readFileSync(join(here, 'tape.json'), 'utf8'))
const seed = JSON.parse(process.argv[2] ?? '{}')
process.stdout.write(JSON.stringify(runTape(tape, seed), null, 2) + '\\n')
`
}
