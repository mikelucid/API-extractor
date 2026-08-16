import { mkdirSync, writeFileSync, existsSync, rmSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import {
  applicationSupportDir,
  launchAgentPlistPath,
  LAUNCH_AGENT_LABEL,
} from "../paths.js";
import { AuditLog, createAuditEvent } from "../audit/index.js";

export interface InstallOptions {
  home?: string;
  dryRun?: boolean;
  nodeBinary?: string;
  entryScript?: string;
  archiveData?: boolean;
}

export function renderLaunchAgentPlist(options: {
  nodeBinary: string;
  entryScript: string;
  label?: string;
}): string {
  const label = options.label ?? LAUNCH_AGENT_LABEL;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(options.nodeBinary)}</string>
    <string>${escapeXml(options.entryScript)}</string>
    <string>daemon</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function installMacos(options: InstallOptions = {}): {
  ok: boolean;
  plistPath: string;
  dataDir: string;
  message: string;
} {
  const dryRun = options.dryRun ?? false;
  const home = options.home;
  const plistPath = launchAgentPlistPath(home);
  const dataDir = applicationSupportDir(home);

  if (process.platform !== "darwin" && !dryRun) {
    return {
      ok: false,
      plistPath,
      dataDir,
      message: "Install is only supported on macOS (darwin). Use --dry-run on other platforms.",
    };
  }

  const plist = renderLaunchAgentPlist({
    nodeBinary: options.nodeBinary ?? process.execPath,
    entryScript: options.entryScript ?? "dist/cli.js",
  });

  if (!dryRun) {
    mkdirSync(dirname(plistPath), { recursive: true });
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(plistPath, plist, "utf8");
  }

  return {
    ok: true,
    plistPath,
    dataDir,
    message: dryRun
      ? `Dry-run: would write LaunchAgent to ${plistPath} and data dir ${dataDir}`
      : `Installed user LaunchAgent at ${plistPath}`,
  };
}

export function uninstallMacos(options: InstallOptions = {}): {
  ok: boolean;
  message: string;
} {
  const dryRun = options.dryRun ?? false;
  const home = options.home;
  const plistPath = launchAgentPlistPath(home);
  const dataDir = applicationSupportDir(home);

  if (process.platform !== "darwin" && !dryRun) {
    return {
      ok: false,
      message: "Uninstall is only supported on macOS (darwin). Use --dry-run on other platforms.",
    };
  }

  if (!dryRun) {
    if (existsSync(plistPath)) rmSync(plistPath, { force: true });
    if (existsSync(dataDir)) {
      if (options.archiveData) {
        renameSync(dataDir, `${dataDir}.archived-${Date.now()}`);
      } else {
        rmSync(dataDir, { recursive: true, force: true });
      }
    }
  }

  return {
    ok: true,
    message: dryRun
      ? `Dry-run: would remove ${plistPath} and ${dataDir}`
      : `Uninstalled LaunchAgent and data dir`,
  };
}

export function recordInstallAudit(
  audit: AuditLog,
  kind: "install" | "uninstall",
  dryRun: boolean,
  summary: string,
): void {
  audit.append(
    createAuditEvent({
      kind,
      summary,
      platform: process.platform,
      dryRun,
    }),
  );
}
