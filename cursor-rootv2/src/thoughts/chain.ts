import { thought as persona } from './00-persona/index.ts'
import { thought as constitution } from './01-constitution/index.ts'
import { thought as observe } from './02-observe/index.ts'
import { thought as diagnose } from './03-diagnose/index.ts'
import { thought as contain } from './04-contain/index.ts'
import { thought as rehearse } from './05-rehearse/index.ts'
import { thought as remember } from './06-remember/index.ts'
import { thought as identity } from './07-identity/index.ts'
import { thought as audit } from './08-audit/index.ts'
import type { ThoughtPattern } from './types.ts'

/** Ordered thought-pattern chain. Each index file is one kind of thought. */
export const THOUGHT_CHAIN: ThoughtPattern[] = [
  persona,
  constitution,
  observe,
  diagnose,
  contain,
  rehearse,
  remember,
  identity,
  audit,
]

export function assertChainLinks(chain: ThoughtPattern[] = THOUGHT_CHAIN): void {
  for (let i = 0; i < chain.length; i++) {
    const node = chain[i]!
    const expectNext = i === chain.length - 1 ? null : chain[i + 1]!.id
    if (node.next !== expectNext) {
      throw new Error(`Broken thought chain at ${node.id}: next=${node.next} expected=${expectNext}`)
    }
    if (node.seq !== i) {
      throw new Error(`Thought ${node.id} seq ${node.seq} != chain index ${i}`)
    }
  }
}
