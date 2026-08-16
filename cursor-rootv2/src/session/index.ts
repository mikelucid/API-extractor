import { appendAudit } from '../audit/index.ts'
import { isAllowlisted, loadAllowlist, type AllowlistStore } from '../allowlist/index.ts'
import { containSession, type KillFn } from '../contain/index.ts'
import { evaluateEvent, type Detection, type SessionEvent, type SessionState } from '../detect/index.ts'

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.8

export type HandleResult =
  | { status: 'ignored'; reason: string }
  | { status: 'soft_alert'; detection: Detection }
  | { status: 'contained'; detection: Detection }

export function createSession(partial: Partial<SessionState> & { id: string }): SessionState {
  return {
    id: partial.id,
    allowlisted: partial.allowlisted ?? false,
    childCount: partial.childCount ?? 0,
    quarantined: partial.quarantined ?? false,
    allowedHosts: partial.allowedHosts ?? ['127.0.0.1', 'localhost'],
    blockedPathPrefixes: partial.blockedPathPrefixes ?? [],
  }
}

export function handleSessionEvent(opts: {
  dataDir: string
  session: SessionState
  event: SessionEvent
  threshold?: number
  kill?: KillFn
  allowlist?: AllowlistStore
}): HandleResult {
  const store = opts.allowlist ?? loadAllowlist(opts.dataDir)
  const allowlisted =
    opts.session.allowlisted ||
    isAllowlisted(store, { id: opts.session.id })
  const session: SessionState = { ...opts.session, allowlisted }

  if (!allowlisted) {
    return { status: 'ignored', reason: 'session not allowlisted' }
  }

  const detection = evaluateEvent(opts.event, session)
  if (!detection) {
    return { status: 'ignored', reason: 'no detection' }
  }

  const threshold = opts.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  if (detection.confidence < threshold) {
    appendAudit(opts.dataDir, {
      type: 'soft_alert',
      sessionId: session.id,
      rule: detection.rule,
      confidence: detection.confidence,
      detail: detection.detail,
      action: 'none',
    })
    return { status: 'soft_alert', detection }
  }

  session.quarantined = true
  const contained = containSession(session.id, opts.kill)
  appendAudit(opts.dataDir, {
    type: 'containment',
    sessionId: session.id,
    rule: detection.rule,
    confidence: detection.confidence,
    detail: detection.detail,
    action: contained.action,
    process: session.id,
  })
  return { status: 'contained', detection }
}
