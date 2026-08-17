import { describe, expect, it } from "vitest";
import { ToolCatalog } from "../src/tools/catalog.js";
import { isToolAllowed } from "../src/tools/allowlist.js";

describe("tools catalog", () => {
  it("stub adapters return usedStub true", async () => {
    const catalog = new ToolCatalog();
    const result = await catalog.execute("local_diagnose", "inspect local agent");
    expect(result.ok).toBe(true);
    expect(result.usedStub).toBe(true);
  });

  it("SD adapter rejected when not allowlisted", async () => {
    const catalog = new ToolCatalog({ allowImageGen: false });
    expect(isToolAllowed(catalog.allowlist, "image_gen")).toBe(false);
    const result = await catalog.execute("image_gen", "draw a cat");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/allowlist/i);
  });

  it("allowlisted SD stub still returns stub payload", async () => {
    const catalog = new ToolCatalog({ allowImageGen: true });
    const result = await catalog.execute("image_gen", "draw a cat");
    expect(result.ok).toBe(true);
    expect(result.usedStub).toBe(true);
  });
});
