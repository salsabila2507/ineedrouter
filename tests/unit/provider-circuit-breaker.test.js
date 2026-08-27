import { beforeEach, describe, expect, it } from "vitest";

import {
  canUseProvider,
  getProviderCircuitStatus,
  recordProviderFailure,
  recordProviderSuccess,
  resetProviderCircuitBreakers,
} from "../../open-sse/services/providerCircuitBreaker.js";

describe("provider circuit breaker", () => {
  beforeEach(() => resetProviderCircuitBreakers());

  it("opens after five upstream failures and reports retry timing", () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      recordProviderFailure("example", 503, 1_000 + attempt);
      expect(canUseProvider("example", 1_000 + attempt).allowed).toBe(true);
    }

    recordProviderFailure("example", 503, 1_004);
    const gate = canUseProvider("example", 1_005);

    expect(gate.allowed).toBe(false);
    expect(gate.state).toBe("OPEN");
    expect(gate.retryAfterMs).toBe(29_999);
  });

  it.each([401, 403, 404, 429])("does not count status %s as provider failure", (status) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      recordProviderFailure("example", status, 2_000 + attempt);
    }

    expect(getProviderCircuitStatus("example", 2_100)).toMatchObject({
      state: "CLOSED",
      failureCount: 0,
    });
  });

  it("allows one half-open probe after cooldown and closes on success", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordProviderFailure("example", 500, 3_000 + attempt);
    }

    expect(canUseProvider("example", 33_004)).toMatchObject({
      allowed: true,
      state: "HALF_OPEN",
      isProbe: true,
    });
    expect(canUseProvider("example", 33_004).allowed).toBe(false);

    recordProviderSuccess("example");
    expect(getProviderCircuitStatus("example", 33_005)).toMatchObject({
      state: "CLOSED",
      failureCount: 0,
    });
  });

  it("reopens immediately when the half-open probe fails", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordProviderFailure("example", 502, 4_000 + attempt);
    }

    expect(canUseProvider("example", 34_004).allowed).toBe(true);
    recordProviderFailure("example", 504, 34_005);

    expect(canUseProvider("example", 34_006)).toMatchObject({
      allowed: false,
      state: "OPEN",
    });
  });
});
