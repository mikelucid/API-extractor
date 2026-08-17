import { FORBIDDEN_PERSONA_FLAGS, PERSONA_PREAMBLE } from '../../persona/index.ts'
import type { ThoughtPattern } from '../types.ts'

/** Thought pattern: mature institutional stance. One kind, one file. */
export const thought: ThoughtPattern = {
  seq: 0,
  id: 'persona',
  kind: 'persona',
  op: 'GATE',
  next: 'constitution',
  describe: () => 'Mature operator gate — reject boredom and young-obstinance flags.',
  compile: () => ({
    seq: 0,
    id: 'persona',
    kind: 'persona',
    op: 'GATE',
    next: 'constitution',
    payload: {
      preamble: PERSONA_PREAMBLE,
      forbiddenFlags: [...FORBIDDEN_PERSONA_FLAGS],
    },
  }),
}
