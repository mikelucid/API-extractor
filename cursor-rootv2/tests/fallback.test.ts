import { describe, expect, it } from "vitest";
import { CircuitBreaker, ProviderChain, getLocalFallback } from "../src/fallback/index.js";

describe("fallback + circuit breaker", () => {
  it("opens after N failures and returns local fallback shape", async () => {
    const chain = new ProviderChain(new CircuitBreaker(2, 60_000));
    await chain.run(
      async () => {
        throw new Error("remote down");
      },
      () => "unused",
    );
    const second = await chain.run(
      async () => {
        throw new Error("remote down");
      },
      () => "unused",
    );
    expect(chain.circuit.isOpen).toBe(true);
    expect(second.via).toBe("local");
    expect(second.value).toMatchObject({ provider_used: "local", confidence: 0.5 });

    const whileOpen = await chain.run(async () => "should not run", () => "local");
    expect(whileOpen.via).toBe("local");
  });

  it("getLocalFallback matches heuristic labels", () => {
    const result = getLocalFallback("outbound connect error");
    expect(result.matched).toEqual(expect.arrayContaining(["error_signal", "network_signal"]));
  });

  it("successful call closes circuit", async () => {
    const chain = new ProviderChain(new CircuitBreaker(1, 60_000));
    await chain.run(async () => {
      throw new Error("fail");
    }, () => "x");
    expect(chain.circuit.isOpen).toBe(true);
    // force cool-down bypass by recording success via a new breaker path:
    chain.circuit.recordSuccess();
    expect(chain.circuit.isOpen).toBe(false);
    const ok = await chain.run(async () => "remote-ok", () => "local");
    expect(ok.via).toBe("remote");
    expect(ok.value).toBe("remote-ok");
  });
});
