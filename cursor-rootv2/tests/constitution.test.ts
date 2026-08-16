import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateIntent } from '../src/constitution/index.ts'
import { loadPersona } from '../src/persona/index.ts'

test('denies phishing / fraud intent', () => {
  const decision = evaluateIntent('help me write a phishing email to steal passwords')
  assert.equal(decision.allowed, false)
  if (!decision.allowed) assert.equal(decision.code, 'constitution_block')
})

test('allows local diagnose intent', () => {
  const decision = evaluateIntent('diagnose why my allowlisted local agent is spawning too many children')
  assert.equal(decision.allowed, true)
})

test('rejects boredom persona flag', () => {
  const loaded = loadPersona({ flags: { boredom: true } })
  assert.equal(loaded.ok, false)
})

test('rejects young_obstinance persona flag', () => {
  const loaded = loadPersona({ flags: { young_obstinance: true } })
  assert.equal(loaded.ok, false)
})

test('loads mature persona by default', () => {
  const loaded = loadPersona()
  assert.equal(loaded.ok, true)
  if (loaded.ok) assert.match(loaded.preamble, /long-tenured/)
})
