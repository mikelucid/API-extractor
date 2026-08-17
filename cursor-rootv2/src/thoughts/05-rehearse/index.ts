import type { ThoughtPattern } from '../types.js'

/** Thought pattern: safe script rehearsal in a path jail. */
export const thought: ThoughtPattern = {
  seq: 5,
  id: 'rehearse',
  kind: 'rehearse',
  op: 'REHEARSE',
  next: 'remember',
  describe: () => 'Rehearse only inside an ephemeral workdir (path-jail).',
  compile: () => ({
    seq: 5,
    id: 'rehearse',
    kind: 'rehearse',
    op: 'REHEARSE',
    next: 'remember',
    payload: {
      capability: 'path-jail',
    },
  }),
}
