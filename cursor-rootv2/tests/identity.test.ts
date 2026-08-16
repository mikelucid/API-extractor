import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { readAuditJsonl } from '../src/audit/index.ts'
import {
  addFriend,
  enrollIdentity,
  IDENTITY_PUBLIC_API,
  resolveIdentity,
} from '../src/identity/index.ts'
import * as identityMod from '../src/identity/index.ts'

test('non-friend resolve is denied without payload in audit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-id-'))
  enrollIdentity(dir, 'a', { displayName: 'Ada' })
  enrollIdentity(dir, 'b', { displayName: 'Bea' })
  const result = resolveIdentity(dir, 'b', 'a')
  assert.equal(result.ok, false)
  const last = readAuditJsonl(dir).at(-1)
  assert.equal(last?.action, 'deny')
  assert.equal(last?.identityPayload, undefined)
})

test('mutual friends can resolve fields', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-id-'))
  enrollIdentity(dir, 'a', { displayName: 'Ada' })
  enrollIdentity(dir, 'b', { displayName: 'Bea' })
  addFriend(dir, 'a', 'b')
  const result = resolveIdentity(dir, 'b', 'a')
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.fields.displayName, 'Ada')
})

test('module does not export scrape/discover APIs', () => {
  const keys = Object.keys(identityMod)
  assert.ok(!keys.includes('scrape'))
  assert.ok(!keys.includes('discover'))
  assert.ok(!keys.includes('autoIdentify'))
  assert.deepEqual([...IDENTITY_PUBLIC_API].sort(), ['addFriend', 'enrollIdentity', 'resolveIdentity'].sort())
})
