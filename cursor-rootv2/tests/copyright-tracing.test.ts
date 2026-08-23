import { describe, expect, it } from "vitest";
import {
  buildCopyrightTraceReport,
  enrichWithLlmMetadata,
  type CopyrightTraceInput,
} from "../src/forensics/copyright-tracing.js";

describe("copyright tracing", () => {
  it("builds required markdown report with verification and telemetry restrictions", () => {
    const input: CopyrightTraceInput = {
      timelineAssets: [
        {
          assetType: "loop",
          timestamp: "00:00:12.300",
          identifiedContent: "Retro pad loop",
          identifiers: { isrc: "US-AAA-24-12345" },
          verificationHint: "Audio fingerprint match (ACRCloud) + DAW timeline",
        },
      ],
      registryRecords: [
        {
          type: "ISRC",
          id: "US-AAA-24-12345",
          rightsOwner: "Example Rights LLC",
          registryContactId: "ASCAP:123456",
        },
      ],
      mediaHeaders: {
        c2pa: [
          {
            manifestId: "c2pa_manifest_001",
            signer: "SignerCo",
            verified: true,
            assertedAssets: [
              {
                assetType: "composition hook",
                timestamp: "00:00:21.000",
                identifiedContent: "Lead hook motif",
                iswc: "T-123.456.789-Z",
              },
            ],
          },
        ],
      },
      archiveRevisions: [
        {
          catalog: "beatport",
          archivedAt: "2025-01-01T00:00:00Z",
          trackKey: "track-1",
          title: "Original Title",
          isrc: "US-AAA-24-12345",
          rightsOwner: "Example Rights LLC",
        },
        {
          catalog: "archive_org",
          archivedAt: "2026-01-01T00:00:00Z",
          trackKey: "track-1",
          title: "Retitled Release",
          isrc: "US-AAA-24-99999",
          rightsOwner: "New Owner Inc.",
        },
      ],
      telemetrySignals: [
        {
          source: "ableton-log.xml",
          kind: "mac_address",
          value: "AA:BB:CC:DD:EE:FF",
        },
      ],
    };

    const report = buildCopyrightTraceReport(input);
    expect(report).toContain("| Asset Type | Timestamp | Identified Content | Copyright Holder / Rights Owner | Registry / Contact ID | Verification Method |");
    expect(report).toContain("Example Rights LLC");
    expect(report).toContain("Verified cryptographic provenance");
    expect(report).toContain("Telemetry Restricted (Requires Judicial Subpoena)");
    expect(report).toContain("Forensic Analysis & Audit Notes");
    expect(report).toContain("detected catalog drift");
  });

  it("enriches unresolved metadata via llm response", async () => {
    const base: CopyrightTraceInput = {
      timelineAssets: [
        {
          assetType: "clip",
          timestamp: "00:00:01.000",
          identifiedContent: "Unknown clip",
        },
      ],
    };

    const enriched = await enrichWithLlmMetadata(base, {
      endpoint: "https://llm.test.local/metadata",
      fetcher: async () =>
        new Response(
          JSON.stringify({
            timelineAssets: [
              {
                assetType: "clip",
                timestamp: "00:00:01.000",
                identifiedContent: "Unknown clip",
                rightsOwner: "LLM Resolved Owner",
                registryId: "BMI:999",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });

    expect(enriched.timelineAssets).toHaveLength(2);
    expect(enriched.timelineAssets?.[1]?.rightsOwner).toBe("LLM Resolved Owner");
  });
});
