import type { ThoughtPattern } from '../types.ts'

/** Thought pattern: name a confirmed local problem. */
export const thought: ThoughtPattern = {
  seq: 3,
  id: 'diagnose',
  kind: 'diagnose',
  op: 'NAME',
  next: 'contain',
  describe: () => 'Diagnose with the v1 detector pack.',
  compile: () => ({
    seq: 3,
    id: 'diagnose',
    kind: 'diagnose',
    op: 'NAME',
    next: 'contain',
    payload: {
      rules: ['disallowed_host', 'runaway_children', 'blocked_path_touch'],
      runawayChildThreshold: 8,
    },
  }),
}
