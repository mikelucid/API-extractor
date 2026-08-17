/**
 * Thought-tape interpreter.
 * This is the compiled-looking runtime: a stepper over GATE/WATCH/NAME/ACT frames,
 * not the original thought-pattern source modules.
 * @param {import('../thoughts/types.ts').ThoughtTape} tape
 * @param {import('../thoughts/types.ts').TapeSeed} seed
 * @returns {import('../thoughts/types.ts').TapeResult}
 */
export function runTape(tape, seed = {}) {
  /** @type {import('../thoughts/types.ts').TapeResult} */
  const acc = { halt: false, log: [] }
  if (!tape || tape.magic !== 'ROOTV2-THOUGHT-TAPE') {
    acc.halt = true
    acc.haltedAt = 'magic'
    acc.decision = { allowed: false, reason: 'Not a Rootv2 thought tape.' }
    return acc
  }

  for (const frame of tape.frames) {
    acc.lastOp = frame.op
    if (acc.halt) break

    if (frame.op === 'GATE' && frame.id === 'persona') {
      const forbidden = frame.payload.forbiddenFlags ?? []
      const flags = seed.flags ?? {}
      for (const key of Object.keys(flags)) {
        if (flags[key] && forbidden.includes(key)) {
          acc.halt = true
          acc.haltedAt = frame.id
          acc.decision = {
            allowed: false,
            code: 'persona_block',
            reason: `Forbidden persona flag "${key}".`,
          }
          acc.log.push({ op: frame.op, id: frame.id, note: 'rejected flag' })
          break
        }
      }
      if (!acc.halt) acc.log.push({ op: frame.op, id: frame.id, note: 'persona ok' })
      continue
    }

    if (frame.op === 'GATE' && frame.id === 'constitution') {
      const intent = (seed.intent ?? '').trim()
      if (intent) {
        const rules = frame.payload.rules ?? []
        let blocked = false
        for (const rule of rules) {
          const re = new RegExp(rule.pattern, rule.flags)
          if (re.test(intent)) {
            acc.halt = true
            acc.haltedAt = frame.id
            acc.decision = { allowed: false, code: 'constitution_block', reason: rule.reason }
            acc.log.push({ op: frame.op, id: frame.id, note: rule.code })
            blocked = true
            break
          }
        }
        if (!blocked) {
          acc.decision = { allowed: true, reason: 'Intent passes constitutional gate.' }
          acc.log.push({ op: frame.op, id: frame.id, note: 'pass' })
        }
      } else {
        acc.log.push({ op: frame.op, id: frame.id, note: 'no intent' })
      }
      continue
    }

    if (frame.op === 'WATCH') {
      if (seed.allowlisted === false) {
        acc.halt = true
        acc.haltedAt = frame.id
        acc.status = 'ignored'
        acc.log.push({ op: frame.op, id: frame.id, note: 'not allowlisted' })
      } else if (seed.allowlisted === true) {
        acc.log.push({ op: frame.op, id: frame.id, note: 'watching' })
      } else {
        acc.log.push({ op: frame.op, id: frame.id, note: 'no session' })
      }
      continue
    }

    if (frame.op === 'NAME') {
      const event = seed.event
      if (event && seed.allowlisted) {
        const detection = diagnoseEvent(event, seed, frame.payload)
        if (detection) {
          acc.detection = detection
          acc.log.push({ op: frame.op, id: frame.id, note: detection.rule })
        } else {
          acc.log.push({ op: frame.op, id: frame.id, note: 'no detection' })
        }
      } else {
        acc.log.push({ op: frame.op, id: frame.id, note: 'skip' })
      }
      continue
    }

    if (frame.op === 'ACT') {
      const threshold = Number(frame.payload.threshold ?? 0.8)
      if (acc.detection) {
        if (acc.detection.confidence >= threshold) {
          acc.status = 'contained'
          acc.log.push({ op: frame.op, id: frame.id, note: 'contained' })
        } else {
          acc.status = 'soft_alert'
          acc.log.push({ op: frame.op, id: frame.id, note: 'soft_alert' })
        }
      } else {
        acc.log.push({ op: frame.op, id: frame.id, note: 'no act' })
      }
      continue
    }

    if (frame.op === 'REHEARSE') {
      const declared = seed.declaredPaths ?? []
      const workdir = seed.workdir
      if (declared.length && workdir) {
        const blocked = declared.some((p) => {
          const resolved = p
          return !(resolved === workdir || resolved.startsWith(workdir.endsWith('/') ? workdir : `${workdir}/`))
        })
        acc.rehearsal = blocked
          ? { ok: false, detail: 'Path jail blocked' }
          : { ok: true, detail: 'Path-jail rehearsal ok' }
        acc.log.push({ op: frame.op, id: frame.id, note: acc.rehearsal.ok ? 'ok' : 'blocked' })
      } else {
        acc.log.push({ op: frame.op, id: frame.id, note: 'no rehearsal' })
      }
      continue
    }

    if (frame.op === 'STORE') {
      const outcome = acc.rehearsal?.ok === false ? 'failure' : acc.status === 'contained' ? 'info' : 'success'
      acc.log.push({ op: frame.op, id: frame.id, note: `memory:${outcome}` })
      continue
    }

    if (frame.op === 'ACL') {
      if (seed.viewerId && seed.subjectId) {
        const self = seed.viewerId === seed.subjectId
        const friends = seed.friends ?? []
        const mutual =
          friends.some(([a, b]) => a === seed.viewerId && b === seed.subjectId) &&
          friends.some(([a, b]) => a === seed.subjectId && b === seed.viewerId)
        if (self || mutual) {
          acc.identity = { ok: true }
          acc.log.push({ op: frame.op, id: frame.id, note: 'allow' })
        } else {
          acc.identity = { ok: false, reason: 'not friends' }
          acc.status = 'denied'
          acc.log.push({ op: frame.op, id: frame.id, note: 'deny' })
        }
      } else {
        acc.log.push({ op: frame.op, id: frame.id, note: 'no identity op' })
      }
      continue
    }

    if (frame.op === 'RECORD') {
      acc.log.push({
        op: frame.op,
        id: frame.id,
        note: acc.status ?? acc.decision?.code ?? 'recorded',
      })
      if (!acc.status && acc.decision?.allowed) acc.status = 'ok'
    }
  }

  return acc
}

function diagnoseEvent(event, seed, payload) {
  const allowedHosts = (seed.allowedHosts ?? ['127.0.0.1', 'localhost']).map((h) => h.toLowerCase())
  const type = event.type ?? ''
  const host = (event.host ?? '').toLowerCase()
  if (type === 'disallowed_host' || (host && type === 'network')) {
    if (host && !allowedHosts.includes(host)) {
      return {
        rule: 'disallowed_host',
        confidence: event.confidence ?? 0.95,
        detail: `Host not on session allowlist: ${host}`,
      }
    }
  }
  if (type === 'runaway_children' || typeof event.childCount === 'number') {
    const count = event.childCount ?? 0
    const limit = Number(payload.runawayChildThreshold ?? 8)
    if (count > limit) {
      return {
        rule: 'runaway_children',
        confidence: event.confidence ?? Math.min(0.99, 0.5 + count / 40),
        detail: `Child process count ${count} exceeds runaway threshold`,
      }
    }
  }
  if (type === 'blocked_path_touch' || event.path) {
    const touched = event.path
    const prefixes = seed.blockedPathPrefixes ?? []
    if (
      touched &&
      prefixes.some((prefix) => touched === prefix || touched.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))
    ) {
      return {
        rule: 'blocked_path_touch',
        confidence: event.confidence ?? 0.9,
        detail: `Touched blocked path ${touched}`,
      }
    }
  }
  return null
}
