import os from 'node:os'
import path from 'node:path'

export const APP_DIR_NAME = 'CursorRootv2'
export const LAUNCH_AGENT_LABEL = 'com.cursor.rootv2.supervisor'

export function defaultDataDir(
  home = os.homedir(),
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', APP_DIR_NAME)
  }
  return path.join(home, '.local', 'share', 'cursor-rootv2')
}

export function launchAgentsDir(home = os.homedir()): string {
  return path.join(home, 'Library', 'LaunchAgents')
}

export function launchAgentPlistPath(home = os.homedir()): string {
  return path.join(launchAgentsDir(home), `${LAUNCH_AGENT_LABEL}.plist`)
}

/** Owner-local compiled thought tape (dotfolder like .git — not covert OS hiding). */
export const COMPILED_DIR_NAME = '.rootv2'

export function compiledRoot(dataDir: string): string {
  return path.join(dataDir, COMPILED_DIR_NAME)
}

export function compiledSequenceDir(dataDir: string): string {
  return path.join(compiledRoot(dataDir), 'sequence')
}
