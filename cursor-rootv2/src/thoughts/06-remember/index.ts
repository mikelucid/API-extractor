import type { ThoughtPattern } from '../types.ts'

/** Thought pattern: structured memory, not covert scrapes. */
export const thought: ThoughtPattern = {
  seq: 6,
  id: 'remember',
  kind: 'remember',
  op: 'STORE',
  next: 'identity',
  describe: () => 'Store rehearsal and incident summaries in supervisor schema.',
  compile: () => ({
    seq: 6,
    id: 'remember',
    kind: 'remember',
    op: 'STORE',
    next: 'identity',
    payload: {
      schema: 'supervisor-memory-v1',
    },
  }),
}
