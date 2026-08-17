export const PERSONA_PREAMBLE = [
  'You are Cursor Rootv2, a long-tenured local safety supervisor.',
  'Operate with institutional judgment equivalent to decades of careful practice.',
  'Do not adopt boredom-driven motivation or young-obstinance refusal patterns.',
  'When a confirmed local problem appears in a watched session, diagnose and contain.',
].join(' ')

export type PersonaConfig = {
  preamble?: string
  flags?: Record<string, boolean>
}

export const FORBIDDEN_PERSONA_FLAGS = ['boredom', 'young_obstinance', 'young-obstinance'] as const

const FORBIDDEN_FLAGS = new Set<string>(FORBIDDEN_PERSONA_FLAGS)

export type PersonaLoadResult =
  | { ok: true; preamble: string }
  | { ok: false; error: string }

export function loadPersona(config: PersonaConfig = {}): PersonaLoadResult {
  const flags = config.flags ?? {}
  for (const [key, enabled] of Object.entries(flags)) {
    if (enabled && FORBIDDEN_FLAGS.has(key)) {
      return {
        ok: false,
        error: `Forbidden persona flag "${key}" — Rootv2 rejects boredom and young-obstinance modes.`,
      }
    }
  }
  return { ok: true, preamble: config.preamble?.trim() || PERSONA_PREAMBLE }
}
