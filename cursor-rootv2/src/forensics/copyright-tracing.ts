import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface TimelineAsset {
  assetType: string;
  timestamp: string;
  identifiedContent: string;
  identifiers?: {
    isrc?: string;
    iswc?: string;
    licenseId?: string;
  };
  rightsOwner?: string;
  registryId?: string;
  verificationHint?: string;
}

export interface RegistryRecord {
  type: "ISRC" | "ISWC" | "LICENSE";
  id: string;
  rightsOwner: string;
  registryContactId: string;
}

export interface MediaHeaderInput {
  bwf?: {
    originator?: string;
    originatorReference?: string;
  }[];
  id3?: {
    title?: string;
    artist?: string;
    isrc?: string;
  }[];
  c2pa?: {
    manifestId: string;
    signer: string;
    verified: boolean;
    assertedAssets?: {
      assetType?: string;
      timestamp?: string;
      identifiedContent?: string;
      isrc?: string;
      iswc?: string;
      licenseId?: string;
    }[];
  }[];
}

export interface ArchiveRevision {
  catalog: string;
  archivedAt: string;
  trackKey: string;
  title?: string;
  isrc?: string;
  rightsOwner?: string;
}

export interface TelemetrySignal {
  source: string;
  kind: "hardware_id" | "serial" | "mac_address";
  value: string;
}

export interface CopyrightTraceInput {
  timelineAssets?: TimelineAsset[];
  registryRecords?: RegistryRecord[];
  mediaHeaders?: MediaHeaderInput;
  archiveRevisions?: ArchiveRevision[];
  telemetrySignals?: TelemetrySignal[];
}

export interface LlmMetadataResponse {
  timelineAssets?: TimelineAsset[];
  registryRecords?: RegistryRecord[];
  archiveRevisions?: ArchiveRevision[];
}

export interface LlmMetadataOptions {
  endpoint: string;
  model?: string;
  fetcher?: typeof fetch;
}

interface ResolvedRow {
  assetType: string;
  timestamp: string;
  identifiedContent: string;
  rightsOwner: string;
  registryContactId: string;
  verificationMethod: string;
}

function normalizeId(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase();
}

function resolveRegistry(
  recordIndex: Map<string, RegistryRecord>,
  identifiers: TimelineAsset["identifiers"] | undefined,
): RegistryRecord | undefined {
  const isrc = normalizeId(identifiers?.isrc);
  if (isrc && recordIndex.has(`ISRC:${isrc}`)) return recordIndex.get(`ISRC:${isrc}`);
  const iswc = normalizeId(identifiers?.iswc);
  if (iswc && recordIndex.has(`ISWC:${iswc}`)) return recordIndex.get(`ISWC:${iswc}`);
  const licenseId = normalizeId(identifiers?.licenseId);
  if (licenseId && recordIndex.has(`LICENSE:${licenseId}`)) return recordIndex.get(`LICENSE:${licenseId}`);
  return undefined;
}

function buildRegistryIndex(records: RegistryRecord[]): Map<string, RegistryRecord> {
  const index = new Map<string, RegistryRecord>();
  for (const record of records) {
    index.set(`${record.type}:${normalizeId(record.id) ?? record.id}`, record);
  }
  return index;
}

function toTimelineRows(input: CopyrightTraceInput): ResolvedRow[] {
  const registryIndex = buildRegistryIndex(input.registryRecords ?? []);
  const rows: ResolvedRow[] = [];
  for (const asset of input.timelineAssets ?? []) {
    const resolved = resolveRegistry(registryIndex, asset.identifiers);
    rows.push({
      assetType: asset.assetType,
      timestamp: asset.timestamp,
      identifiedContent: asset.identifiedContent,
      rightsOwner: resolved?.rightsOwner ?? asset.rightsOwner ?? "Unknown / Manual Review Required",
      registryContactId: resolved?.registryContactId ?? asset.registryId ?? "N/A",
      verificationMethod: asset.verificationHint ?? "DAW timeline + fingerprint correlation",
    });
  }
  for (const c2pa of input.mediaHeaders?.c2pa ?? []) {
    for (const asserted of c2pa.assertedAssets ?? []) {
      const resolved = resolveRegistry(registryIndex, {
        isrc: asserted.isrc,
        iswc: asserted.iswc,
        licenseId: asserted.licenseId,
      });
      rows.push({
        assetType: asserted.assetType ?? "C2PA asserted asset",
        timestamp: asserted.timestamp ?? "Unknown",
        identifiedContent: asserted.identifiedContent ?? c2pa.manifestId,
        rightsOwner: resolved?.rightsOwner ?? "Unknown / Manual Review Required",
        registryContactId: resolved?.registryContactId ?? "N/A",
        verificationMethod: c2pa.verified
          ? `Verified cryptographic provenance (C2PA signer: ${c2pa.signer})`
          : "Unsigned or unverified C2PA claim (treat as editable metadata)",
      });
    }
  }
  return rows;
}

function quoteCell(value: string): string {
  return value.replaceAll("\n", " ").replaceAll("|", "\\|").trim();
}

function metadataChainOfCustody(input: CopyrightTraceInput): string[] {
  const notes: string[] = [];
  const c2pa = input.mediaHeaders?.c2pa ?? [];
  const verified = c2pa.filter((entry) => entry.verified);
  const unverified = c2pa.filter((entry) => !entry.verified);
  if (verified.length > 0) {
    notes.push(
      `Intact cryptographic provenance detected in ${verified.length} C2PA manifest(s): ${verified
        .map((entry) => `${entry.manifestId} (signer ${entry.signer})`)
        .join(", ")}.`,
    );
  } else {
    notes.push("No verified C2PA manifests detected; provenance relies on editable metadata and correlation evidence.");
  }
  if ((input.mediaHeaders?.bwf?.length ?? 0) > 0 || (input.mediaHeaders?.id3?.length ?? 0) > 0) {
    notes.push("BWF/ID3 headers present; treat as mutable local/container metadata unless corroborated by signed provenance.");
  }
  if (unverified.length > 0) {
    notes.push(
      `Unverified C2PA manifest(s) require caution: ${unverified.map((entry) => entry.manifestId).join(", ")}.`,
    );
  }
  return notes;
}

function historicalDiscrepancies(input: CopyrightTraceInput): string[] {
  const revisions = [...(input.archiveRevisions ?? [])].sort((a, b) => a.archivedAt.localeCompare(b.archivedAt));
  if (revisions.length === 0) {
    return ["No archival revision data provided."];
  }
  const byTrack = new Map<string, ArchiveRevision[]>();
  for (const revision of revisions) {
    const list = byTrack.get(revision.trackKey) ?? [];
    list.push(revision);
    byTrack.set(revision.trackKey, list);
  }
  const notes: string[] = [];
  for (const [trackKey, changes] of byTrack) {
    const owners = new Set(changes.map((entry) => entry.rightsOwner?.trim()).filter(Boolean));
    const isrcs = new Set(changes.map((entry) => normalizeId(entry.isrc)).filter(Boolean));
    const titles = new Set(changes.map((entry) => entry.title?.trim()).filter(Boolean));
    if (owners.size > 1 || isrcs.size > 1 || titles.size > 1) {
      const latest = changes[changes.length - 1];
      notes.push(
        `${trackKey}: detected catalog drift across ${changes.length} snapshot(s); latest at ${latest.archivedAt} lists owner=${
          latest.rightsOwner ?? "unknown"
        }, ISRC=${latest.isrc ?? "unknown"}, title=${latest.title ?? "unknown"}.`,
      );
    }
  }
  return notes.length > 0 ? notes : ["No retroactive credit/title/ISRC discrepancies detected in provided archive snapshots."];
}

function telemetrySummary(input: CopyrightTraceInput): string[] {
  const signals = input.telemetrySignals ?? [];
  if (signals.length === 0) {
    return ["No hardware IDs, serial numbers, or MAC addresses were detected in supplied logs."];
  }
  return signals.map(
    (signal) =>
      `${signal.kind} from ${signal.source}: ${signal.value} — Telemetry Restricted (Requires Judicial Subpoena).`,
  );
}

export function buildCopyrightTraceReport(input: CopyrightTraceInput): string {
  const rows = toTimelineRows(input);
  const tableRows =
    rows.length > 0
      ? rows
          .map(
            (row) =>
              `| ${quoteCell(row.assetType)} | ${quoteCell(row.timestamp)} | ${quoteCell(row.identifiedContent)} | ${quoteCell(
                row.rightsOwner,
              )} | ${quoteCell(row.registryContactId)} | ${quoteCell(row.verificationMethod)} |`,
          )
          .join("\n")
      : "| No identifiable asset rows | N/A | N/A | N/A | N/A | Insufficient input data |";

  const custody = metadataChainOfCustody(input)
    .map((line) => `- ${line}`)
    .join("\n");
  const discrepancies = historicalDiscrepancies(input)
    .map((line) => `- ${line}`)
    .join("\n");
  const telemetry = telemetrySummary(input)
    .map((line) => `- ${line}`)
    .join("\n");

  return [
    "| Asset Type | Timestamp | Identified Content | Copyright Holder / Rights Owner | Registry / Contact ID | Verification Method |",
    "|---|---|---|---|---|---|",
    tableRows,
    "",
    "## Forensic Analysis & Audit Notes",
    "",
    "### Metadata Chain of Custody",
    custody,
    "",
    "### Historical Catalog Discrepancies",
    discrepancies,
    "",
    "### System Telemetry Summary",
    telemetry,
  ].join("\n");
}

export function loadTraceInput(path: string): CopyrightTraceInput {
  return JSON.parse(readFileSync(path, "utf8")) as CopyrightTraceInput;
}

export function writeTraceReport(path: string, report: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, report, "utf8");
}

export function inputMtimeMs(path: string): number {
  return statSync(path).mtimeMs;
}

export async function enrichWithLlmMetadata(
  input: CopyrightTraceInput,
  options: LlmMetadataOptions,
): Promise<CopyrightTraceInput> {
  const fetcher = options.fetcher ?? fetch;
  const unresolved = (input.timelineAssets ?? []).filter(
    (asset) => !asset.rightsOwner && !asset.registryId && !asset.identifiers?.isrc && !asset.identifiers?.iswc,
  );
  const payload = {
    task: "metadata-retrieval-and-rights-resolution",
    model: options.model ?? "default",
    input: {
      unresolvedTimelineAssets: unresolved,
      mediaHeaders: input.mediaHeaders ?? {},
      archiveRevisions: input.archiveRevisions ?? [],
    },
    outputSchema: {
      timelineAssets: "TimelineAsset[]",
      registryRecords: "RegistryRecord[]",
      archiveRevisions: "ArchiveRevision[]",
    },
  };

  const response = await fetcher(options.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`LLM metadata retrieval failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as LlmMetadataResponse;
  return {
    timelineAssets: [...(input.timelineAssets ?? []), ...(data.timelineAssets ?? [])],
    registryRecords: [...(input.registryRecords ?? []), ...(data.registryRecords ?? [])],
    mediaHeaders: input.mediaHeaders,
    archiveRevisions: [...(input.archiveRevisions ?? []), ...(data.archiveRevisions ?? [])],
    telemetrySignals: input.telemetrySignals,
  };
}
