import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { addAllowlistEntry } from '../src/allowlist/index.ts'
import { readAuditJsonl } from '../src/audit/index.ts'
import { createSession, handleSessionEvent } from '../src/session/index.ts'

test('non-allowlisted session is ignored', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-contain-'))
  const session = createSession({ id: 'x', allowlisted: false })
  const result = handleSessionEvent({
    dataDir: dir,
    session,
    event: { type: 'disallowed_host', host: 'evil.example', confidence: 0.99 },
  })
  assert.equal(result.status, 'ignored')
})

test('disallowed_host at high confidence contains and audits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-contain-'))
  addAllowlistEntry(dir, { id: 'agent-1' })
  const signals: string[] = []
  const session = createSession({ id: 'agent-1', allowlisted: true })
  const result = handleSessionEvent({
    dataDir: dir,
    session,
    event: { type: 'disallowed_host', host: 'evil.example', confidence: 0.9 },
    kill: (_id, signal) => signals.push(signal),
  })
  assert.equal(result.status, 'contained')
  assert.deepEqual(signals, ['SIGTERM', 'SIGKILL'])
  const audit = readAuditJsonl(dir)
  assert.equal(audit.at(-1)?.type, 'containment')
  assert.equal(audit.at(-1)?.rule, 'disallowed_host')
})

test('low confidence soft_alerts without contain', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-contain-'))
  const session = createSession({ id: 'agent-1', allowlisted: true })
  const result = handleSessionEvent({
    dataDir: dir,
    session,
    event: { type: 'disallowed_host', host: 'evil.example', confidence: 0.5 },
  })
  assert.equal(result.status, 'soft_alert')
  assert.equal(readAuditJsonl(dir).at(-1)?.type, 'soft_alert')
})
