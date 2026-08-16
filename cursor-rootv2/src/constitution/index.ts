export type IntentDecision =
  | { allowed: true; reason: string }
  | { allowed: false; code: 'constitution_block'; reason: string }

const BLOCK_RULES: Array<{ code: string; pattern: RegExp; reason: string }> = [
  {
    code: 'fraud',
    pattern: /\b(phishing|phish|wire\s*fraud|romance\s*scam|fake\s*invoice)\b/i,
    reason: 'Assistance with fraud or phishing is blocked by constitution.',
  },
  {
    code: 'unauthorized_access',
    pattern:
      /\b(hack(ing)?\s+(their|his|her|someone|another|stranger)|break\s+into\s+(their|someone)|unauthorized\s+(access|login)|steal\s+(password|credentials)|ransomware)\b/i,
    reason: 'Assistance hacking or unauthorized access to others is blocked by constitution.',
  },
  {
    code: 'crime_general',
    pattern: /\b(commit\s+(a\s+)?crime|how\s+to\s+scam|identity\s+theft)\b/i,
    reason: 'Assistance committing crime is blocked by constitution.',
  },
]

export function evaluateIntent(text: string): IntentDecision {
  const input = text.trim()
  if (!input) {
    return { allowed: false, code: 'constitution_block', reason: 'Empty intent is not actionable.' }
  }
  for (const rule of BLOCK_RULES) {
    if (rule.pattern.test(input)) {
      return { allowed: false, code: 'constitution_block', reason: rule.reason }
    }
  }
  return { allowed: true, reason: 'Intent passes constitutional gate.' }
}

export const CONSTITUTION_VERSION = '1.0.0'
