import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { appendAudit } from '../audit/index.ts'

export type IdentityFields = {
  displayName: string
  note?: string
}

type IdentityIndex = {
  people: Array<{ id: string; consent: true; friends: string[] }>
}

function indexPath(dataDir: string): string {
  return path.join(dataDir, 'identity', 'index.json')
}

function keyPath(dataDir: string): string {
  return path.join(dataDir, 'identity', 'vault.key')
}

function blobPath(dataDir: string, id: string): string {
  return path.join(dataDir, 'identity', `${id}.bin`)
}

function ensureKey(dataDir: string): Buffer {
  const dir = path.join(dataDir, 'identity')
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const kp = keyPath(dataDir)
  if (!fs.existsSync(kp)) {
    const key = crypto.randomBytes(32)
    fs.writeFileSync(kp, key, { mode: 0o600 })
    return key
  }
  return fs.readFileSync(kp)
}

function loadIndex(dataDir: string): IdentityIndex {
  const p = indexPath(dataDir)
  if (!fs.existsSync(p)) return { people: [] }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as IdentityIndex
}

function saveIndex(dataDir: string, index: IdentityIndex): void {
  fs.mkdirSync(path.join(dataDir, 'identity'), { recursive: true, mode: 0o700 })
  fs.writeFileSync(indexPath(dataDir), JSON.stringify(index, null, 2))
}

function encrypt(dataDir: string, fields: IdentityFields): Buffer {
  const key = ensureKey(dataDir)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(fields), 'utf8')
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc])
}

function decrypt(dataDir: string, blob: Buffer): IdentityFields {
  const key = ensureKey(dataDir)
  const iv = blob.subarray(0, 12)
  const tag = blob.subarray(12, 28)
  const enc = blob.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(enc), decipher.final()])
  return JSON.parse(plain.toString('utf8')) as IdentityFields
}

export function enrollIdentity(
  dataDir: string,
  id: string,
  fields: IdentityFields,
): void {
  const index = loadIndex(dataDir)
  if (!index.people.some((p) => p.id === id)) {
    index.people.push({ id, consent: true, friends: [] })
  }
  saveIndex(dataDir, index)
  fs.writeFileSync(blobPath(dataDir, id), encrypt(dataDir, fields), { mode: 0o600 })
  appendAudit(dataDir, { type: 'identity_enroll', subjectId: id, action: 'enroll' })
}

export function addFriend(dataDir: string, a: string, b: string): void {
  const index = loadIndex(dataDir)
  const left = index.people.find((p) => p.id === a)
  const right = index.people.find((p) => p.id === b)
  if (!left || !right) throw new Error('Both identities must be enrolled before friending')
  if (!left.friends.includes(b)) left.friends.push(b)
  if (!right.friends.includes(a)) right.friends.push(a)
  saveIndex(dataDir, index)
  appendAudit(dataDir, { type: 'identity_friend', subjectId: a, peerId: b, action: 'friend' })
}

export type ResolveResult =
  | { ok: true; fields: IdentityFields }
  | { ok: false; reason: string }

export function resolveIdentity(dataDir: string, viewerId: string, subjectId: string): ResolveResult {
  const index = loadIndex(dataDir)
  const viewer = index.people.find((p) => p.id === viewerId)
  const subject = index.people.find((p) => p.id === subjectId)
  if (!viewer || !subject) {
    appendAudit(dataDir, {
      type: 'identity_resolve',
      viewerId,
      subjectId,
      action: 'deny',
      reason: 'missing',
    })
    return { ok: false, reason: 'missing identity' }
  }
  const mutual = viewer.friends.includes(subjectId) && subject.friends.includes(viewerId)
  const self = viewerId === subjectId
  if (!mutual && !self) {
    appendAudit(dataDir, {
      type: 'identity_resolve',
      viewerId,
      subjectId,
      action: 'deny',
      reason: 'not_friends',
    })
    return { ok: false, reason: 'not friends' }
  }
  const blob = fs.readFileSync(blobPath(dataDir, subjectId))
  const fields = decrypt(dataDir, blob)
  appendAudit(dataDir, {
    type: 'identity_resolve',
    viewerId,
    subjectId,
    action: 'allow',
    // deliberately omit identityPayload
  })
  return { ok: true, fields }
}

/** v1 exports — no scrape/discover APIs by design. */
export const IDENTITY_PUBLIC_API = ['enrollIdentity', 'addFriend', 'resolveIdentity'] as const
