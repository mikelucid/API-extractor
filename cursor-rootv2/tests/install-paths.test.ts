import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  installMacos,
  uninstallMacos,
  renderLaunchAgentPlist,
} from "../src/install/macos.js";
import { launchAgentPlistPath, applicationSupportDir } from "../src/paths.js";

describe("macos install paths", () => {
  it("plist path is under ~/Library/LaunchAgents", () => {
    const home = "/Users/owner";
    expect(launchAgentPlistPath(home)).toBe(
      "/Users/owner/Library/LaunchAgents/com.cursor.rootv2.supervisor.plist",
    );
    if (process.platform === "darwin") {
      expect(applicationSupportDir(home)).toContain("Application Support/CursorRootv2");
    } else {
      expect(applicationSupportDir(home)).toContain(".local/share/CursorRootv2");
    }
  });

  it("dry-run install reports paths without requiring darwin", () => {
    const home = mkdtempSync(join(tmpdir(), "rootv2-home-"));
    const result = installMacos({ home, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.plistPath).toContain("LaunchAgents");
    expect(result.message).toMatch(/Dry-run/i);
  });

  it("dry-run uninstall reports removal intent", () => {
    const home = mkdtempSync(join(tmpdir(), "rootv2-home-un-"));
    const result = uninstallMacos({ home, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/Dry-run/i);
  });

  it("non-darwin install without dry-run is rejected", () => {
    if (process.platform === "darwin") return;
    const result = installMacos({ dryRun: false });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/macOS/i);
  });

  it("renders user-domain LaunchAgent plist (not LaunchDaemon)", () => {
    const plist = renderLaunchAgentPlist({
      nodeBinary: "/usr/bin/node",
      entryScript: "/opt/cursor-rootv2/dist/cli.js",
    });
    expect(plist).toContain("com.cursor.rootv2.supervisor");
    expect(plist).not.toMatch(/LaunchDaemon/i);
  });
});
