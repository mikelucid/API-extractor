import { IDENTITY_PUBLIC_API } from '../../identity/index.js'
import type { ThoughtPattern } from '../types.js'

/** Thought pattern: friends-only, consent enroll. */
export const thought: ThoughtPattern = {
  seq: 7,
  id: 'identity',
  kind: 'identity',
  op: 'ACL',
  next: 'audit',
  describe: () => 'Resolve identity only for mutual friends; no stranger scrape.',
  compile: () => ({
    seq: 7,
    id: 'identity',
    kind: 'identity',
    op: 'ACL',
    next: 'audit',
    payload: {
      publicApi: [...IDENTITY_PUBLIC_API],
      mode: 'mutual-friends',
    },
  }),
}
