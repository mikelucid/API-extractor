/**
 * Circuit breaker adapted from Legal.ai LegalProviderManager / CircuitBreaker.
 * Opens after N failures; while open, callers must use local fallback.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly failureThreshold = 3,
    private readonly coolDownMs = 30_000,
  ) {}

  get isOpen(): boolean {
    if (this.openedAt === null) return false;
    if (Date.now() - this.openedAt >= this.coolDownMs) {
      this.openedAt = null;
      this.failures = 0;
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.openedAt = Date.now();
    }
  }
}

export interface LocalFallbackResult {
  ok: true;
  provider_used: "local";
  confidence: 0.5;
  matched: string[];
  summary: string;
}

/** Resurrected getLocalFallback regex/heuristic shape from Legal.ai. */
export function getLocalFallback(content: string): LocalFallbackResult {
  const patterns: Array<{ re: RegExp; label: string }> = [
    { re: /\b(error|fail|exception)\b/i, label: "error_signal" },
    { re: /\b(outbound|http|https|connect)\b/i, label: "network_signal" },
    { re: /\b(spawn|fork|child)\b/i, label: "spawn_signal" },
    { re: /\b(safe|ok|healthy)\b/i, label: "safe_signal" },
  ];
  const matched = patterns.filter((p) => p.re.test(content)).map((p) => p.label);
  return {
    ok: true,
    provider_used: "local",
    confidence: 0.5,
    matched,
    summary:
      matched.length > 0
        ? `Local fallback matched: ${matched.join(", ")}`
        : "Local fallback: no remote provider; heuristic scan empty.",
  };
}

export class ProviderChain {
  constructor(private readonly breaker = new CircuitBreaker()) {}

  async run<T>(
    remote: () => Promise<T>,
    local: () => T,
  ): Promise<{ value: T | LocalFallbackResult; via: "remote" | "local" }> {
    if (this.breaker.isOpen) {
      return { value: getLocalFallback(String(local())), via: "local" };
    }
    try {
      const value = await remote();
      this.breaker.recordSuccess();
      return { value, via: "remote" };
    } catch {
      this.breaker.recordFailure();
      return { value: getLocalFallback("error"), via: "local" };
    }
  }

  get circuit(): CircuitBreaker {
    return this.breaker;
  }
}
