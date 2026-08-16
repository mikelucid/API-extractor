import fs from 'node:fs'
import path from 'node:path'

export type AllowlistEntry = {
  id: string
  argvPrefix?: string
  absolutePath?: string
}

export type AllowlistStore = {
  entries: AllowlistEntry[]
}

function storePath(dataDir: string): string {
  return path.join(dataDir, 'allowlist.json')
}

export function loadAllowlist(dataDir: string): AllowlistStore {
  const p = storePath(dataDir)
  if (!fs.existsSync(p)) return { entries: [] }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as AllowlistStore
}

export function saveAllowlist(dataDir: string, store: AllowlistStore): void {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(storePath(dataDir), JSON.stringify(store, null, 2))
}

export function addAllowlistEntry(dataDir: string, entry: AllowlistEntry): AllowlistStore {
  const store = loadAllowlist(dataDir)
  store.entries = store.entries.filter((e) => e.id !== entry.id)
  store.entries.push(entry)
  saveAllowlist(dataDir, store)
  return store
}

export function isAllowlisted(
  store: AllowlistStore,
  candidate: { id?: string; argv?: string; absolutePath?: string },
): boolean {
  return store.entries.some((entry) => {
    if (candidate.id && entry.id === candidate.id) return true
    if (entry.absolutePath && candidate.absolutePath === entry.absolutePath) return true
    if (entry.argvPrefix && candidate.argv?.startsWith(entry.argvPrefix)) return true
    return false
  })
}
