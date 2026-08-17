import { thought as persona } from './00-persona/index.js'
import { thought as constitution } from './01-constitution/index.js'
import { thought as observe } from './02-observe/index.js'
import { thought as diagnose } from './03-diagnose/index.js'
import { thought as contain } from './04-contain/index.js'
import { thought as rehearse } from './05-rehearse/index.js'
import { thought as remember } from './06-remember/index.js'
import { thought as identity } from './07-identity/index.js'
import { thought as audit } from './08-audit/index.js'
import type { ThoughtPattern } from './types.js'

export const THOUGHT_BY_ID: Record<string, ThoughtPattern> = {
  persona,
  constitution,
  observe,
  diagnose,
  contain,
  rehearse,
  remember,
  identity,
  audit,
}

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

export const PIPELINE_IDS = ['contain', 'remember', 'rehearse'] as const
export type PipelineId = (typeof PIPELINE_IDS)[number]

/** Alternate think orders. Persona + constitution stay first (fail closed). */
export const PIPELINES: Record<PipelineId, string[]> = {
  contain: ['persona', 'constitution', 'observe', 'diagnose', 'contain', 'rehearse', 'remember', 'identity', 'audit'],
  remember: ['persona', 'constitution', 'remember', 'observe', 'diagnose', 'contain', 'rehearse', 'identity', 'audit'],
  rehearse: ['persona', 'constitution', 'rehearse', 'remember', 'observe', 'diagnose', 'contain', 'identity', 'audit'],
}

export function isPipelineId(value: string): value is PipelineId {
  return (PIPELINE_IDS as readonly string[]).includes(value)
}

export function pipelineChain(id: PipelineId): ThoughtPattern[] {
  const order = PIPELINES[id]
  if (order[0] !== 'persona' || order[1] !== 'constitution') {
    throw new Error(`Pipeline ${id} must start with persona, constitution`)
  }
  return order.map((thoughtId, seq) => {
    const source = THOUGHT_BY_ID[thoughtId]
    if (!source) throw new Error(`Unknown thought ${thoughtId}`)
    const next = order[seq + 1] ?? null
    return {
      ...source,
      seq,
      next,
      compile: () => {
        const compiled = source.compile()
        return { ...compiled, seq, next }
      },
    }
  })
}

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
