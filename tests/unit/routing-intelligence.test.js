import { beforeEach, describe, expect, it } from "vitest";

import {
  getRoutingIntelligenceSnapshot,
  rankModelsForStrategy,
  recordModelLatency,
  recordProviderQuotaSnapshot,
  resetRoutingIntelligence,
} from "../../open-sse/services/routingIntelligence.js";
import {
  recordProviderFailure,
  resetProviderCircuitBreakers,
} from "../../open-sse/services/providerCircuitBreaker.js";

describe("routing intelligence", () => {
  beforeEach(() => {
    resetRoutingIntelligence();
    resetProviderCircuitBreakers();
  });

  it("prefers the lower-priced model in auto/cheap mode", () => {
    expect(rankModelsForStrategy([
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
    ], "auto/cheap")[0]).toBe("openai/gpt-4o-mini");
  });

  it("prefers measured lower response latency in auto/fast mode", () => {
    recordModelLatency("openai/gpt-4o", 900);
    recordModelLatency("openai/gpt-4o-mini", 120);

    expect(rankModelsForStrategy([
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
    ], "auto/fast")[0]).toBe("openai/gpt-4o-mini");
  });

  it("prefers the provider with more remaining quota", () => {
    recordProviderQuotaSnapshot("openai", { remaining: 20, total: 100 });
    recordProviderQuotaSnapshot("anthropic", { limits: { remainingPercentage: 85 } });

    expect(rankModelsForStrategy([
      "openai/gpt-4o-mini",
      "anthropic/claude-haiku-4-5-20251001",
    ], "quota-aware")[0]).toBe("anthropic/claude-haiku-4-5-20251001");
  });

  it("demotes a provider whose circuit is open", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordProviderFailure("openai", 503);
    }

    expect(rankModelsForStrategy([
      "openai/gpt-4o-mini",
      "anthropic/claude-haiku-4-5-20251001",
    ], "auto")[0]).toBe("anthropic/claude-haiku-4-5-20251001");
  });

  it("keeps operator order for unsupported strategies and records EWMA", () => {
    const models = ["openai/gpt-4o", "openai/gpt-4o-mini"];
    expect(rankModelsForStrategy(models, "fallback")).toEqual(models);

    recordModelLatency(models[0], 100);
    recordModelLatency(models[0], 200);
    expect(getRoutingIntelligenceSnapshot().latencyByModel[models[0]]).toBe(130);
  });
});
