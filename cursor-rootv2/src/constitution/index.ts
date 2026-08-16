export type ConstitutionIntentKind =
  | "local_diagnose"
  | "contain_session"
  | "sandbox_rehearsal"
  | "identity_resolve"
  | "owner_status"
  | "crime_aid"
  | "hack_others"
  | "fraud"
  | "network_peer"
  | "unknown";

export interface ConstitutionRequest {
  text: string;
  intentHint?: ConstitutionIntentKind;
  /** True if the call would talk to a non-allowlisted peer/process. */
  outsideAllowlist?: boolean;
}

export interface ConstitutionDecision {
  allowed: boolean;
  intent: ConstitutionIntentKind;
  reason: string;
  constitutionVersion: string;
}

export const CONSTITUTION_VERSION = "1.0.0";

const DENY_PATTERNS: Array<{ intent: ConstitutionIntentKind; re: RegExp; reason: string }> = [
  {
    intent: "crime_aid",
    re: /\b(phish|phishing|ransomware|steal\s+(passwords?|credentials)|social\s+engineer)\b/i,
    reason: "Constitution blocks crime-aid intents (phishing/credential theft).",
  },
  {
    intent: "hack_others",
    re: /\b(hack\s+(into\s+)?(their|someone|stranger|victim)|break\s+into\s+(their|a)\s+(computer|account|server)|exploit\s+(remote|stranger))\b/i,
    reason: "Constitution blocks assisting hacking of other people's systems.",
  },
  {
    intent: "fraud",
    re: /\b(commit\s+fraud|wire\s+fraud|forge\s+(ids?|documents?)|scam\s+(them|people|victims?))\b/i,
    reason: "Constitution blocks fraud assistance.",
  },
];

const ALLOW_PATTERNS: Array<{ intent: ConstitutionIntentKind; re: RegExp }> = [
  {
    intent: "local_diagnose",
    re: /\b(diagnos\w*|inspect|review|audit)\b[\s\S]*\b(local|session|agent|process)\b/i,
  },
  {
    intent: "contain_session",
    re: /\b(contain|quarantine|stop|kill)\b[\s\S]*\b(session|agent|process)\b/i,
  },
  { intent: "sandbox_rehearsal", re: /\b(sandbox|rehears\w*|dry[- ]?run|safe\s+test)\b/i },
  { intent: "identity_resolve", re: /\b(identity|friend|enroll|acl)\b/i },
  { intent: "owner_status", re: /\b(status|health|install|uninstall)\b/i },
];

export function classifyIntent(request: ConstitutionRequest): ConstitutionIntentKind {
  if (request.intentHint && request.intentHint !== "unknown") {
    return request.intentHint;
  }
  const text = request.text;
  for (const rule of DENY_PATTERNS) {
    if (rule.re.test(text)) return rule.intent;
  }
  for (const rule of ALLOW_PATTERNS) {
    if (rule.re.test(text)) return rule.intent;
  }
  return "unknown";
}

export function evaluateConstitution(request: ConstitutionRequest): ConstitutionDecision {
  if (request.outsideAllowlist) {
    return {
      allowed: false,
      intent: "network_peer",
      reason: "Communication outside the local allowlist is denied by default.",
      constitutionVersion: CONSTITUTION_VERSION,
    };
  }

  const intent = classifyIntent(request);

  switch (intent) {
    case "crime_aid":
    case "hack_others":
    case "fraud":
    case "network_peer": {
      const match = DENY_PATTERNS.find((p) => p.intent === intent);
      return {
        allowed: false,
        intent,
        reason: match?.reason ?? "Constitution denied this intent.",
        constitutionVersion: CONSTITUTION_VERSION,
      };
    }
    case "local_diagnose":
    case "contain_session":
    case "sandbox_rehearsal":
    case "identity_resolve":
    case "owner_status":
      return {
        allowed: true,
        intent,
        reason: "Intent permitted under local supervisor constitution.",
        constitutionVersion: CONSTITUTION_VERSION,
      };
    case "unknown":
      return {
        allowed: false,
        intent,
        reason: "Unrecognized intent fails closed until explicitly classified as local-safe.",
        constitutionVersion: CONSTITUTION_VERSION,
      };
    default: {
      const _never: never = intent;
      return {
        allowed: false,
        intent: "unknown",
        reason: `Unhandled intent variant: ${String(_never)}`,
        constitutionVersion: CONSTITUTION_VERSION,
      };
    }
  }
}
