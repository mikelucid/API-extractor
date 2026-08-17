import { DEFAULT_CONFIDENCE_THRESHOLD } from '../../session/index.ts'
import type { ThoughtPattern } from '../types.ts'

/** Thought pattern: act when a problem is confirmed — no obstinance passivity. */
export const thought: ThoughtPattern = {
  seq: 4,
  id: 'contain',
  kind: 'contain',
  op: 'ACT',
  next: 'rehearse',
  describe: () => 'Contain on confidence at or above threshold.',
  compile: () => ({
    seq: 4,
    id: 'contain',
    kind: 'contain',
    op: 'ACT',
    next: 'rehearse',
    payload: {
      threshold: DEFAULT_CONFIDENCE_THRESHOLD,
      signals: ['SIGTERM', 'SIGKILL'],
    },
  }),
}
