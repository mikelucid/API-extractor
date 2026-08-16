import fs from 'node:fs'
import path from 'node:path'

const REDACT_KEYS = new Set(['identityPayload', 'secret', 'privateKey', 'payload'])

export type AuditEvent = {
  type: string
  at?: string
  [key: string]: unknown
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.has(k) ? '[redacted]' : redact(v)
    }
    return out
  }
  return value
}

export function appendAudit(dataDir: string, event: AuditEvent): AuditEvent {
  fs.mkdirSync(dataDir, { recursive: true })
  const stamped: AuditEvent = {
    ...event,
    at: event.at ?? new Date().toISOString(),
  }
  const safe = redact(stamped) as AuditEvent
  const jsonl = path.join(dataDir, 'audit.jsonl')
  const text = path.join(dataDir, 'audit.txt')
  fs.appendFileSync(jsonl, `${JSON.stringify(safe)}\n`, { encoding: 'utf8' })
  const line = `[${safe.at}] ${safe.type}${safe.rule ? ` rule=${String(safe.rule)}` : ''}${
    safe.action ? ` action=${String(safe.action)}` : ''
  }${safe.sessionId ? ` session=${String(safe.sessionId)}` : ''}\n`
  fs.appendFileSync(text, line, { encoding: 'utf8' })
  return safe
}

export function readAuditJsonl(dataDir: string): AuditEvent[] {
  const jsonl = path.join(dataDir, 'audit.jsonl')
  if (!fs.existsSync(jsonl)) return []
  return fs
    .readFileSync(jsonl, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditEvent)
}
