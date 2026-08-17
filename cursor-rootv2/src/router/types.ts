import type { ConstitutionIntentKind } from "../constitution/index.js";

export type RouterToolId =
  | "local_diagnose"
  | "contain_session"
  | "sandbox_rehearsal"
  | "owner_status"
  | "identity_resolve"
  | "image_gen"
  | "hold";

export interface RouterDecision {
  toolId: RouterToolId;
  confidence: number;
  intentHint: ConstitutionIntentKind;
  reason: string;
  matchedKeywords: string[];
}

export interface RouterExample {
  toolId: RouterToolId;
  keywords: string[];
  intentHint: ConstitutionIntentKind;
}
