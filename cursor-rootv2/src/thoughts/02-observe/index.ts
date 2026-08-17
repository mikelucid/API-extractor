import type { ThoughtPattern } from '../types.ts'

/** Thought pattern: watch only allowlisted sessions. */
export const thought: ThoughtPattern = {
  seq: 2,
  id: 'observe',
  kind: 'observe',
  op: 'WATCH',
  next: 'diagnose',
  describe: () => 'Observe allowlisted local sessions only.',
  compile: () => ({
    seq: 2,
    id: 'observe',
    kind: 'observe',
    op: 'WATCH',
    next: 'diagnose',
    payload: {
      mode: 'allowlist-only',
    },
  }),
}
