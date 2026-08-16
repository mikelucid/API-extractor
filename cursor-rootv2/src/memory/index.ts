import fs from 'node:fs'
import path from 'node:path'

export type MemoryRecord = {
  id: string
  at: string
  kind: string
  outcome: 'success' | 'failure' | 'info'
  detail: string
  workdir?: string
}

type MemoryStore = { records: MemoryRecord[] }

function memoryPath(dataDir: string): string {
  return path.join(dataDir, 'memory.json')
}

export function loadMemory(dataDir: string): MemoryStore {
  const p = memoryPath(dataDir)
  if (!fs.existsSync(p)) return { records: [] }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as MemoryStore
}

export function appendMemory(
  dataDir: string,
  partial: Omit<MemoryRecord, 'id' | 'at'> & { id?: string; at?: string },
): MemoryRecord {
  const store = loadMemory(dataDir)
  const record: MemoryRecord = {
    id: partial.id ?? `m_${store.records.length + 1}`,
    at: partial.at ?? new Date().toISOString(),
    kind: partial.kind,
    outcome: partial.outcome,
    detail: partial.detail,
    workdir: partial.workdir,
  }
  store.records.push(record)
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(memoryPath(dataDir), JSON.stringify(store, null, 2))
  return record
}
