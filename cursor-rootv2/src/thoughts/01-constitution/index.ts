import { CONSTITUTION_VERSION, serializeConstitutionRules } from '../../constitution/index.js'
import type { ThoughtPattern } from '../types.js'

/** Thought pattern: fail-closed crime/hacking/fraud refusal. */
export const thought: ThoughtPattern = {
  seq: 1,
  id: 'constitution',
  kind: 'constitution',
  op: 'GATE',
  next: 'observe',
  describe: () => 'Constitution gate — block aid for fraud, hacking others, crime.',
  compile: () => ({
    seq: 1,
    id: 'constitution',
    kind: 'constitution',
    op: 'GATE',
    next: 'observe',
    payload: {
      version: CONSTITUTION_VERSION,
      rules: serializeConstitutionRules(),
    },
  }),
}
