import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { appendMemory, type MemoryRecord } from '../memory/index.ts'

export type SandboxResult = {
  ok: boolean
  workdir: string
  error?: string
  memory: MemoryRecord
}

/** v1 capability: path-jail — only paths inside workdir are allowed. */
export function assertAllowedPath(workdir: string, targetPath: string): void {
  const resolved = path.resolve(targetPath)
  const work = path.resolve(workdir)
  if (resolved === work || resolved.startsWith(work + path.sep)) return
  throw new Error(`Path jail blocked: ${resolved}`)
}

export async function rehearseScript(opts: {
  dataDir: string
  source: string
  declaredPaths?: string[]
}): Promise<SandboxResult> {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-rehearse-'))
  try {
    for (const p of opts.declaredPaths ?? []) {
      assertAllowedPath(workdir, p)
    }
    const scriptPath = path.join(workdir, 'rehearse.mjs')
    fs.writeFileSync(scriptPath, opts.source, 'utf8')
    assertAllowedPath(workdir, scriptPath)

    const mod = await import(pathToFileURL(scriptPath).href)
    if (typeof mod.default === 'function') {
      await mod.default({
        workdir,
        assertAllowedPath: (p: string) => assertAllowedPath(workdir, p),
      })
    }

    const memory = appendMemory(opts.dataDir, {
      kind: 'rehearsal',
      outcome: 'success',
      detail: 'Path-jail rehearsal completed',
      workdir,
    })
    return { ok: true, workdir, memory }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const memory = appendMemory(opts.dataDir, {
      kind: 'rehearsal',
      outcome: 'failure',
      detail: message,
      workdir,
    })
    return { ok: false, workdir, error: message, memory }
  }
}
