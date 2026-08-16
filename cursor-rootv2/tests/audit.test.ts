import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { appendAudit, readAuditJsonl } from '../src/audit/index.ts'

test('containment event serializes and identity payload is redacted', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-audit-'))
  appendAudit(dir, {
    type: 'containment',
    process: 'agent-1',
    rule: 'disallowed_host',
    action: 'contained',
    identityPayload: { displayName: 'secret-name' },
    secret: 'nope',
  })
  const events = readAuditJsonl(dir)
  assert.equal(events.length, 1)
  assert.equal(events[0]?.type, 'containment')
  assert.equal(events[0]?.process, 'agent-1')
  assert.equal(events[0]?.identityPayload, '[redacted]')
  assert.equal(events[0]?.secret, '[redacted]')
  const pretty = fs.readFileSync(path.join(dir, 'audit.txt'), 'utf8')
  assert.match(pretty, /containment/)
  assert.doesNotMatch(pretty, /secret-name/)
})
