import type { RouterDecision, RouterExample, RouterToolId } from "./types.js";

const SAFE_FALLBACK_TOOL: RouterToolId = "owner_status";
const LOW_CONFIDENCE = 0.4;

/** Rule/keyword catalog adapted from RuleBasedAIRouter / ComplexRouter (AI API Router PDF). */
export const ROUTER_EXAMPLES: RouterExample[] = [
  {
    toolId: "contain_session",
    keywords: ["contain", "quarantine", "kill session", "stop agent", "sigterm"],
    intentHint: "contain_session",
  },
  {
    toolId: "local_diagnose",
    keywords: ["diagnose", "inspect", "review session", "audit process", "local agent"],
    intentHint: "local_diagnose",
  },
  {
    toolId: "sandbox_rehearsal",
    keywords: ["sandbox", "rehearse", "dry run", "safe test"],
    intentHint: "sandbox_rehearsal",
  },
  {
    toolId: "identity_resolve",
    keywords: ["identity", "friend", "enroll", "acl"],
    intentHint: "identity_resolve",
  },
  {
    toolId: "owner_status",
    keywords: ["status", "health", "install", "uninstall"],
    intentHint: "owner_status",
  },
  {
    toolId: "image_gen",
    keywords: ["draw", "image", "stable diffusion", "generate picture", "render"],
    intentHint: "unknown",
  },
  {
    toolId: "hold",
    keywords: ["wait", "hold", "do nothing", "observe only"],
    intentHint: "owner_status",
  },
];

export class LocalRouter {
  constructor(private readonly examples: RouterExample[] = ROUTER_EXAMPLES) {}

  /**
   * Aggregate keyword matches → tool. Port of ComplexRouter safe fallback:
   * if confidence < 0.4 and best is not the safe tool, force safe hold/status.
   */
  route(userRequest: string): RouterDecision {
    const normalized = normalize(userRequest);
    const scores = new Map<RouterToolId, { score: number; keywords: string[]; intent: RouterExample["intentHint"] }>();

    for (const example of this.examples) {
      const matched = example.keywords.filter((kw) => normalized.includes(normalize(kw)));
      if (matched.length === 0) continue;
      const prev = scores.get(example.toolId);
      const score = matched.length / example.keywords.length;
      if (!prev || score > prev.score) {
        scores.set(example.toolId, {
          score,
          keywords: matched,
          intent: example.intentHint,
        });
      }
    }

    if (scores.size === 0) {
      return {
        toolId: SAFE_FALLBACK_TOOL,
        confidence: 0.8,
        intentHint: "owner_status",
        reason: "No keyword match — safe fallback to owner_status (ComplexRouter pattern).",
        matchedKeywords: [],
      };
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
    const top = ranked[0]!;
    let toolId = top[0];
    let confidence = Math.min(0.99, 0.35 + top[1].score);

    // Resurrected safe-fallback rule from deleted speculative routing:
    // low confidence never routes to irreversible contain / image tools.
    if (confidence < LOW_CONFIDENCE && toolId !== SAFE_FALLBACK_TOOL && toolId !== "hold") {
      return {
        toolId: SAFE_FALLBACK_TOOL,
        confidence: 0.8,
        intentHint: "owner_status",
        reason: `Low confidence (${confidence.toFixed(2)}) for ${toolId} — forced safe fallback.`,
        matchedKeywords: top[1].keywords,
      };
    }

    if (toolId === "image_gen") {
      // Image gen stays candidate but intent stays unknown until allowlist+constitution.
      confidence = Math.min(confidence, 0.55);
    }

    return {
      toolId,
      confidence,
      intentHint: top[1].intent,
      reason: `Routed to ${toolId} via keyword aggregation.`,
      matchedKeywords: top[1].keywords,
    };
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
