import os from 'node:os'
import path from 'node:path'
import { defaultDataDir, LAUNCH_AGENT_LABEL, launchAgentPlistPath } from '../paths.ts'

export type InstallPlan = {
  platform: NodeJS.Platform
  supported: boolean
  plistPath: string
  dataDir: string
  label: string
  plistContents: string
}

export function buildPlist(opts: { programArgs: string[]; dataDir: string; label?: string }): string {
  const label = opts.label ?? LAUNCH_AGENT_LABEL
  const argsXml = opts.programArgs.map((a) => `    <string>${escapeXml(a)}</string>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${escapeXml(opts.dataDir)}</string>
  <key>StandardOutPath</key>
  <string>${escapeXml(path.join(opts.dataDir, 'supervisor.out.log'))}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(path.join(opts.dataDir, 'supervisor.err.log'))}</string>
</dict>
</plist>
`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function planInstall(opts?: {
  home?: string
  platform?: NodeJS.Platform
  programArgs?: string[]
}): InstallPlan {
  const home = opts?.home ?? os.homedir()
  const platform = opts?.platform ?? process.platform
  const dataDir = defaultDataDir(home, platform)
  const plistPath = launchAgentPlistPath(home)
  const programArgs = opts?.programArgs ?? ['node', path.join(dataDir, 'run-daemon.js')]
  return {
    platform,
    supported: platform === 'darwin',
    plistPath,
    dataDir,
    label: LAUNCH_AGENT_LABEL,
    plistContents: buildPlist({ programArgs, dataDir }),
  }
}

export function planUninstall(opts?: {
  home?: string
  platform?: NodeJS.Platform
}): { plistPath: string; dataDir: string } {
  const home = opts?.home ?? os.homedir()
  const platform = opts?.platform ?? process.platform
  return {
    plistPath: launchAgentPlistPath(home),
    dataDir: defaultDataDir(home, platform),
  }
}
