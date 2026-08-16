import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { planInstall, planUninstall } from '../src/install/macos.ts'
import { LAUNCH_AGENT_LABEL } from '../src/paths.ts'

test('plist path is under LaunchAgents and not LaunchDaemons', () => {
  const home = '/Users/testowner'
  const plan = planInstall({ home, platform: 'darwin' })
  assert.equal(plan.supported, true)
  assert.equal(plan.plistPath, path.join(home, 'Library', 'LaunchAgents', `${LAUNCH_AGENT_LABEL}.plist`))
  assert.doesNotMatch(plan.plistPath, /LaunchDaemons/)
  assert.match(plan.plistContents, /RunAtLoad/)
})

test('uninstall plan lists plist and data dir', () => {
  const home = '/Users/testowner'
  const plan = planUninstall({ home, platform: 'darwin' })
  assert.ok(plan.plistPath.includes('LaunchAgents'))
  assert.ok(plan.dataDir.includes('CursorRootv2'))
})

test('non-darwin install is unsupported', () => {
  const plan = planInstall({ platform: 'linux', home: os.homedir() })
  assert.equal(plan.supported, false)
})
