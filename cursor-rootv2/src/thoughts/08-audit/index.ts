import type { ThoughtPattern } from '../types.js'

/** Thought pattern: owner-readable action record. */
export const thought: ThoughtPattern = {
  seq: 8,
  id: 'audit',
  kind: 'audit',
  op: 'RECORD',
  next: null,
  describe: () => 'Append human-readable audit of supervisor actions.',
  compile: () => ({
    seq: 8,
    id: 'audit',
    kind: 'audit',
    op: 'RECORD',
    next: null,
    payload: {
      formats: ['jsonl', 'txt'],
      redact: ['identityPayload', 'secret', 'privateKey', 'payload'],
    },
  }),
}
