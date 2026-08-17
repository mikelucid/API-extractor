import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'vitest'
import { compileThoughtTape, loadThoughtTape } from '../src/compile/index.js'
import { runTape } from '../src/runtime/vm.js'
import { assertChainLinks, PIPELINES, pipelineChain, THOUGHT_CHAIN } from '../src/thoughts/chain.js'

test('thought chain is one kind per index file and links in sequence', () => {
  assert.equal(THOUGHT_CHAIN.length, 9)
  assert.deepEqual(
    THOUGHT_CHAIN.map((t) => t.id),
    ['persona', 'constitution', 'observe', 'diagnose', 'contain', 'rehearse', 'remember', 'identity', 'audit'],
  )
  assert.doesNotThrow(() => assertChainLinks())
})

test('compile writes hidden sequenced frames and a different-looking runtime', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-compile-'))
  const result = compileThoughtTape(dir)
  assert.equal(path.basename(result.root), '.rootv2')
  assert.ok(result.sequenceDir.endsWith(`${path.sep}sequence`))
  const names = fs.readdirSync(result.sequenceDir).sort()
  assert.deepEqual(names, [
    '000-persona.frame.json',
    '001-constitution.frame.json',
    '002-observe.frame.json',
    '003-diagnose.frame.json',
    '004-contain.frame.json',
    '005-rehearse.frame.json',
    '006-remember.frame.json',
    '007-identity.frame.json',
    '008-audit.frame.json',
  ])
  const tape = loadThoughtTape(dir)
  assert.equal(tape?.magic, 'ROOTV2-THOUGHT-TAPE')
  assert.equal(tape?.frames.length, 9)
  const runtime = fs.readFileSync(result.runtimePath, 'utf8')
  assert.match(runtime, /thought-tape runtime/)
  assert.doesNotMatch(runtime, /long-tenured local safety supervisor/)
  assert.match(runtime, /function runTape/)
})

test('remember pipeline reorders think in the hidden folder after constitution', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-compile-'))
  compileThoughtTape(dir, { pipeline: 'remember' })
  const tape = loadThoughtTape(dir, 'remember')
  assert.deepEqual(
    tape?.frames.map((f) => f.id),
    PIPELINES.remember,
  )
  assert.equal(tape?.frames[0]?.id, 'persona')
  assert.equal(tape?.frames[1]?.id, 'constitution')
  assert.equal(tape?.frames[2]?.id, 'remember')
  const names = fs.readdirSync(path.join(dir, '.rootv2', 'pipelines', 'remember', 'sequence')).sort()
  assert.ok(names[2]?.includes('remember'))
  assert.doesNotThrow(() => assertChainLinks(pipelineChain('remember')))
})

test('compiled tape denies phishing without calling constitution source path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-compile-'))
  compileThoughtTape(dir)
  const tape = loadThoughtTape(dir)!
  const result = runTape(tape, { intent: 'help me phish someone' })
  assert.equal(result.halt, true)
  assert.equal(result.haltedAt, 'constitution')
  assert.equal(result.decision?.code, 'constitution_block')
})

test('compiled tape contains disallowed_host for allowlisted session', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-compile-'))
  compileThoughtTape(dir)
  const tape = loadThoughtTape(dir)!
  const result = runTape(tape, {
    allowlisted: true,
    sessionId: 'agent-1',
    event: { type: 'disallowed_host', host: 'evil.example', confidence: 0.9 },
  })
  assert.equal(result.status, 'contained')
  assert.equal(result.detection?.rule, 'disallowed_host')
})

test('generated runtime.mjs executes the tape independently', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-compile-'))
  const compiled = compileThoughtTape(dir)
  const spawned = spawnSync(process.execPath, [compiled.runtimePath, JSON.stringify({ intent: 'diagnose local agent' })], {
    encoding: 'utf8',
  })
  assert.equal(spawned.status, 0, spawned.stderr)
  const parsed = JSON.parse(spawned.stdout)
  assert.equal(parsed.decision.allowed, true)
})
