import fs from 'node:fs'
import path from 'node:path'
import {
  DISSONANCE_THRESHOLD,
  RESONANCE_THRESHOLD,
  scoreHarmony,
  signatureOf,
  type HarmonicKind,
  type HarmonyScore,
  type Signature,
} from '../harmony/index.js'
import { compiledRoot } from '../paths.js'

export type MemoryLayer = {
  at: string
  meaning: string
  harmonic: HarmonicKind
  score: number
}

export type MemoryLink = {
  id: string
  harmonic: HarmonicKind
  score: number
}

export type MemoryRecord = {
  id: string
  at: string
  kind: string
  outcome: 'success' | 'failure' | 'info'
  detail: string
  workdir?: string
  signature: Signature
  layers: MemoryLayer[]
  links: MemoryLink[]
  depth: number
  reads: number
  lastReadAt?: string
}

export type MemoryStore = { records: MemoryRecord[] }

export type IngestResult = {
  record: MemoryRecord
  action: 'created' | 'deepened' | 'counterpoint'
  harmonic?: HarmonyScore & { peerId: string }
}

function memoryPath(dataDir: string): string {
  return path.join(dataDir, 'memory.json')
}

function graphPath(dataDir: string): string {
  return path.join(compiledRoot(dataDir), 'memory-graph.json')
}

function saveStore(dataDir: string, store: MemoryStore): void {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(memoryPath(dataDir), JSON.stringify(store, null, 2))
  fs.mkdirSync(compiledRoot(dataDir), { recursive: true })
  fs.writeFileSync(
    graphPath(dataDir),
    JSON.stringify(
      {
        nodes: store.records.map((r) => ({ id: r.id, kind: r.kind, depth: r.depth, outcome: r.outcome })),
        edges: store.records.flatMap((r) => r.links.map((link) => ({ from: r.id, to: link.id, harmonic: link.harmonic, score: link.score }))),
      },
      null,
      2,
    ),
  )
}

export function loadMemory(dataDir: string): MemoryStore {
  const p = memoryPath(dataDir)
  if (!fs.existsSync(p)) return { records: [] }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as MemoryStore
  raw.records = raw.records.map(normalizeRecord)
  return raw
}

function normalizeRecord(record: MemoryRecord): MemoryRecord {
  return {
    ...record,
    signature: record.signature ?? signatureOf(record),
    layers: record.layers ?? [],
    links: record.links ?? [],
    depth: record.depth ?? 1,
    reads: record.reads ?? 0,
  }
}

function linkBoth(store: MemoryStore, aId: string, bId: string, harmonic: HarmonicKind, score: number): void {
  const a = store.records.find((r) => r.id === aId)
  const b = store.records.find((r) => r.id === bId)
  if (!a || !b) return
  upsertLink(a, bId, harmonic, score)
  upsertLink(b, aId, harmonic, score)
}

function upsertLink(record: MemoryRecord, peerId: string, harmonic: HarmonicKind, score: number): void {
  const existing = record.links.find((l) => l.id === peerId)
  if (existing) {
    existing.harmonic = harmonic
    existing.score = score
    return
  }
  record.links.push({ id: peerId, harmonic, score })
}

function nearest(store: MemoryStore, sig: Signature): { record: MemoryRecord; score: HarmonyScore } | null {
  let best: { record: MemoryRecord; score: HarmonyScore } | null = null
  for (const record of store.records) {
    const scored = scoreHarmony(sig, record.signature)
    if (!best || Math.abs(scored.score) > Math.abs(best.score.score)) {
      best = { record, score: scored }
    }
  }
  return best
}

export function ingestMemory(
  dataDir: string,
  partial: Omit<MemoryRecord, 'id' | 'at' | 'signature' | 'layers' | 'links' | 'depth' | 'reads'> & {
    id?: string
    at?: string
    meaning?: string
  },
): IngestResult {
  const store = loadMemory(dataDir)
  const sig = signatureOf(partial)
  const match = nearest(store, sig)
  const now = partial.at ?? new Date().toISOString()

  if (match && match.score.harmonic === 'resonate' && match.score.score >= RESONANCE_THRESHOLD) {
    match.record.layers.push({
      at: now,
      meaning: partial.meaning ?? partial.detail,
      harmonic: 'resonate',
      score: match.score.score,
    })
    match.record.depth += 1
    match.record.detail = partial.detail
    match.record.outcome = partial.outcome
    match.record.signature = sig
    saveStore(dataDir, store)
    return {
      record: match.record,
      action: 'deepened',
      harmonic: { ...match.score, peerId: match.record.id },
    }
  }

  const record: MemoryRecord = {
    id: partial.id ?? `m_${store.records.length + 1}`,
    at: now,
    kind: partial.kind,
    outcome: partial.outcome,
    detail: partial.detail,
    ...(partial.workdir ? { workdir: partial.workdir } : {}),
    signature: sig,
    layers: partial.meaning
      ? [{ at: now, meaning: partial.meaning, harmonic: 'neutral', score: 0 }]
      : [],
    links: [],
    depth: 1,
    reads: 0,
  }
  store.records.push(record)

  if (match && match.score.harmonic === 'dissonate' && Math.abs(match.score.score) >= DISSONANCE_THRESHOLD) {
    linkBoth(store, record.id, match.record.id, 'dissonate', match.score.score)
    record.layers.push({
      at: now,
      meaning: `counterpoint to ${match.record.id}: ${partial.meaning ?? partial.detail}`,
      harmonic: 'dissonate',
      score: match.score.score,
    })
    record.depth += 1
    saveStore(dataDir, store)
    return {
      record,
      action: 'counterpoint',
      harmonic: { ...match.score, peerId: match.record.id },
    }
  }

  if (match && match.score.harmonic !== 'neutral') {
    linkBoth(store, record.id, match.record.id, match.score.harmonic, match.score.score)
  }

  saveStore(dataDir, store)
  return {
    record,
    action: "created",
    ...(match ? { harmonic: { ...match.score, peerId: match.record.id } } : {}),
  }
}

export function appendMemory(
  dataDir: string,
  partial: Omit<MemoryRecord, 'id' | 'at' | 'signature' | 'layers' | 'links' | 'depth' | 'reads'> & {
    id?: string
    at?: string
  },
): MemoryRecord {
  return ingestMemory(dataDir, partial).record
}

export type RecallHit = {
  record: MemoryRecord
  harmonic: HarmonicKind
  score: number
}

export function recallMemory(dataDir: string, query: string, kind = 'query'): RecallHit[] {
  const store = loadMemory(dataDir)
  const sig = signatureOf({ kind, outcome: 'info', detail: query })
  const now = new Date().toISOString()
  const hits: RecallHit[] = store.records.map((record) => {
    const scored = scoreHarmony(sig, record.signature)
    record.reads += 1
    record.lastReadAt = now
    return { record, harmonic: scored.harmonic, score: scored.score }
  })
  hits.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
  saveStore(dataDir, store)
  return hits
}
