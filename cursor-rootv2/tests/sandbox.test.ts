import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { loadMemory } from '../src/memory/index.ts'
import { assertAllowedPath, rehearseScript } from '../src/sandbox/index.ts'

test('blocked home path fails closed and records memory failure', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-sand-'))
  const homeSsh = path.join(os.homedir(), '.ssh', 'id_rsa')
  const result = await rehearseScript({
    dataDir: dir,
    source: 'export default async () => {}',
    declaredPaths: [homeSsh],
  })
  assert.equal(result.ok, false)
  assert.match(result.error ?? '', /Path jail blocked/)
  const memory = loadMemory(dir)
  assert.equal(memory.records.at(-1)?.outcome, 'failure')
})

test('workdir-local path succeeds', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-sand-'))
  // declaredPaths checked before workdir exists in rehearse — use only script-internal checks
  const result = await rehearseScript({
    dataDir: dir,
    source: `import fs from 'node:fs'; import path from 'node:path';
export default async ({ workdir, assertAllowedPath }) => {
  const p = path.join(workdir, 'out.txt');
  assertAllowedPath(p);
  fs.writeFileSync(p, 'ok');
}`,
  })
  assert.equal(result.ok, true)
  assert.equal(loadMemory(dir).records.at(-1)?.outcome, 'success')
})

test('assertAllowedPath allows only workdir tree', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rootv2-work-'))
  assert.doesNotThrow(() => assertAllowedPath(work, path.join(work, 'a.txt')))
  assert.throws(() => assertAllowedPath(work, path.join(os.homedir(), '.ssh')))
})
