export type ThoughtKind =
  | 'persona'
  | 'constitution'
  | 'observe'
  | 'diagnose'
  | 'contain'
  | 'rehearse'
  | 'remember'
  | 'identity'
  | 'audit'

export type ThoughtOp =
  | 'GATE'
  | 'WATCH'
  | 'NAME'
  | 'ACT'
  | 'REHEARSE'
  | 'STORE'
  | 'ACL'
  | 'RECORD'

export type CompiledFrame = {
  seq: number
  id: string
  kind: ThoughtKind
  op: ThoughtOp
  next: string | null
  hash: string
  payload: Record<string, unknown>
}

export type ThoughtPattern = {
  seq: number
  id: string
  kind: ThoughtKind
  op: ThoughtOp
  next: string | null
  describe(): string
  compile(): Omit<CompiledFrame, 'hash'>
}

export const TAPE_MAGIC = 'ROOTV2-THOUGHT-TAPE'

export type ThoughtTape = {
  magic: typeof TAPE_MAGIC
  version: number
  compiledAt: string
  frames: CompiledFrame[]
}

export type TapeSeed = {
  intent?: string
  flags?: Record<string, boolean>
  allowlisted?: boolean
  sessionId?: string
  event?: {
    type?: string
    host?: string
    path?: string
    childCount?: number
    confidence?: number
  }
  allowedHosts?: string[]
  blockedPathPrefixes?: string[]
  declaredPaths?: string[]
  workdir?: string
  viewerId?: string
  subjectId?: string
  friends?: Array<[string, string]>
}

export type TapeResult = {
  halt: boolean
  haltedAt?: string
  decision?: { allowed: boolean; code?: string; reason: string }
  status?: 'ignored' | 'soft_alert' | 'contained' | 'ok' | 'denied'
  detection?: { rule: string; confidence: number; detail: string }
  rehearsal?: { ok: boolean; detail: string }
  identity?: { ok: boolean; reason?: string }
  log: Array<{ op: string; id: string; note: string }>
  lastOp?: string
}
