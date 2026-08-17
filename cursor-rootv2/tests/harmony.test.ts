import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'vitest'
import { ingestMemory, recallMemory } from '../src/memory/index.js'
import { scoreHarmony, signatureOf } from '../src/harmony/index.js'

test('same-topic same-outcome resonates', () => {
  const a = signatureOf({ kind: 'incident', outcome: 'success', detail: 'contained disallowed host evil.example' })
  const b = signatureOf({ kind: 'incident', outcome: 'success', detail: 'contained disallowed host evil.example again' })
  const scored = scoreHarmony(a, b)
  assert.equal(scored.harmonic, 'resonate')
  assert.ok(scored.score >= 0.35)
})

test('same-topic opposite-outcome dissonates', () => {
  const a = signatureOf({ kind: 'rehearsal', outcome: 'success', detail: 'path jail rehearsal completed workdir' })
  const b = signatureOf({ kind: 'rehearsal', outcome: 'failure', detail: 'path jail rehearsal blocked workdir' })
  const scored = scoreHarmony(a, b)
  assert.equal(scored.harmonic, 'dissonate')
  assert.ok(scored.score < 0)
})

test('resonant ingest deepens existing memory instead of duplicating', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-harm-'))
  const first = ingestMemory(dir, {
    kind: 'incident',
    outcome: 'success',
    detail: 'contained disallowed host evil.example',
  })
  const second = ingestMemory(dir, {
    kind: 'incident',
    outcome: 'success',
    detail: 'contained disallowed host evil.example on retry',
    meaning: 'repeat containment confirms the rule',
  })
  assert.equal(second.action, 'deepened')
  assert.equal(second.record.id, first.record.id)
  assert.ok(second.record.depth >= 2)
  assert.ok(second.record.layers.length >= 1)
})

test('dissonant ingest creates a linked counterpoint', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-harm-'))
  ingestMemory(dir, {
    kind: 'rehearsal',
    outcome: 'success',
    detail: 'path jail rehearsal completed workdir',
  })
  const second = ingestMemory(dir, {
    kind: 'rehearsal',
    outcome: 'failure',
    detail: 'path jail rehearsal blocked workdir home ssh',
  })
  assert.equal(second.action, 'counterpoint')
  assert.equal(second.record.links[0]?.harmonic, 'dissonate')
})

test('recall ranks by harmonic magnitude and records access traces', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-harm-'))
  ingestMemory(dir, { kind: 'incident', outcome: 'success', detail: 'contained disallowed host evil.example' })
  ingestMemory(dir, { kind: 'note', outcome: 'info', detail: 'unrelated calendar reminder' })
  const hits = recallMemory(dir, 'disallowed host evil.example')
  assert.ok(hits.length >= 2)
  assert.ok(Math.abs(hits[0]!.score) >= Math.abs(hits[1]!.score))
  assert.ok((hits[0]!.record.reads ?? 0) >= 1)
})
