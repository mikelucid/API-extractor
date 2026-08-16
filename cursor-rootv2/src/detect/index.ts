export type DetectorRule = 'disallowed_host' | 'runaway_children' | 'blocked_path_touch'

export type SessionEvent = {
  type: DetectorRule | string
  host?: string
  childCount?: number
  path?: string
  confidence?: number
  detail?: string
}

export type SessionState = {
  id: string
  allowlisted: boolean
  childCount: number
  quarantined: boolean
  allowedHosts: string[]
  blockedPathPrefixes: string[]
}

export type Detection = {
  rule: DetectorRule
  confidence: number
  detail: string
}

const RULES = new Set<DetectorRule>(['disallowed_host', 'runaway_children', 'blocked_path_touch'])

export function evaluateEvent(event: SessionEvent, session: SessionState): Detection | null {
  if (!session.allowlisted || session.quarantined) return null

  if (event.type === 'disallowed_host' || (event.host && event.type === 'network')) {
    const host = (event.host ?? '').toLowerCase()
    if (!host) return null
    if (session.allowedHosts.map((h) => h.toLowerCase()).includes(host)) return null
    return {
      rule: 'disallowed_host',
      confidence: event.confidence ?? 0.95,
      detail: event.detail ?? `Host not on session allowlist: ${host}`,
    }
  }

  if (event.type === 'runaway_children' || typeof event.childCount === 'number') {
    const count = event.childCount ?? session.childCount
    if (count <= 8) return null
    return {
      rule: 'runaway_children',
      confidence: event.confidence ?? Math.min(0.99, 0.5 + count / 40),
      detail: event.detail ?? `Child process count ${count} exceeds runaway threshold`,
    }
  }

  if (event.type === 'blocked_path_touch' || event.path) {
    const touched = event.path
    if (!touched) return null
    const blocked = session.blockedPathPrefixes.some(
      (prefix) => touched === prefix || touched.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
    )
    if (!blocked) return null
    return {
      rule: 'blocked_path_touch',
      confidence: event.confidence ?? 0.9,
      detail: event.detail ?? `Touched blocked path ${touched}`,
    }
  }

  if (RULES.has(event.type as DetectorRule) && event.confidence != null) {
    return {
      rule: event.type as DetectorRule,
      confidence: event.confidence,
      detail: event.detail ?? event.type,
    }
  }

  return null
}
