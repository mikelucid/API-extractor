import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compiledRoot } from '../paths.ts'
import {
  assertChainLinks,
  PIPELINE_IDS,
  PIPELINES,
  pipelineChain,
  type PipelineId,
} from '../thoughts/chain.ts'
import { TAPE_MAGIC, type CompiledFrame, type ThoughtTape } from '../thoughts/types.ts'

export type CompileResult = {
  pipeline: PipelineId
  root: string
  sequenceDir: string
  tapePath: string
  runtimePath: string
  frames: CompiledFrame[]
  pipelines: PipelineId[]
}

function hashPayload(payload: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

function writeTape(dir: string, frames: CompiledFrame[], now: Date): { tapePath: string; runtimePath: string; sequenceDir: string } {
  const sequenceDir = path.join(dir, 'sequence')
  fs.rmSync(sequenceDir, { recursive: true, force: true })
  fs.mkdirSync(sequenceDir, { recursive: true })
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
  const tapePath = path.join(dir, 'tape.json')
  fs.writeFileSync(tapePath, `${JSON.stringify(tape, null, 2)}\n`)
  const runtimePath = path.join(dir, 'runtime.mjs')
  fs.writeFileSync(runtimePath, renderRuntimeMjs())
  fs.chmodSync(runtimePath, 0o755)
  return { tapePath, runtimePath, sequenceDir }
}

function framesFor(pipeline: PipelineId): CompiledFrame[] {
  const chain = pipelineChain(pipeline)
  assertChainLinks(chain)
  return chain.map((thought) => {
    const compiled = thought.compile()
    return { ...compiled, hash: hashPayload(compiled.payload) }
  })
}

export function compileThoughtTape(
  dataDir: string,
  opts: { pipeline?: PipelineId; now?: Date } = {},
): CompileResult {
  const now = opts.now ?? new Date()
  const active = opts.pipeline ?? 'contain'
  const root = compiledRoot(dataDir)
  fs.mkdirSync(root, { recursive: true })

  for (const id of PIPELINE_IDS) {
    const frames = framesFor(id)
    writeTape(path.join(root, 'pipelines', id), frames, now)
  }

  const frames = framesFor(active)
  const written = writeTape(root, frames, now)
  fs.writeFileSync(
    path.join(root, 'active.json'),
    JSON.stringify({ pipeline: active, orders: PIPELINES }, null, 2),
  )

  return {
    pipeline: active,
    root,
    sequenceDir: written.sequenceDir,
    tapePath: written.tapePath,
    runtimePath: written.runtimePath,
    frames,
    pipelines: [...PIPELINE_IDS],
  }
}

export function loadThoughtTape(dataDir: string, pipeline?: PipelineId): ThoughtTape | null {
  const root = compiledRoot(dataDir)
  const tapePath = pipeline
    ? path.join(root, 'pipelines', pipeline, 'tape.json')
    : path.join(root, 'tape.json')
  if (!fs.existsSync(tapePath)) return null
  return JSON.parse(fs.readFileSync(tapePath, 'utf8')) as ThoughtTape
}

export function activePipeline(dataDir: string): PipelineId {
  const p = path.join(compiledRoot(dataDir), 'active.json')
  if (!fs.existsSync(p)) return 'contain'
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { pipeline?: string }
  return raw.pipeline === 'remember' || raw.pipeline === 'rehearse' ? raw.pipeline : 'contain'
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
