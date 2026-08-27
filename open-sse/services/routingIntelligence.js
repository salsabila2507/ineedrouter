import { getPricingForModel } from "../providers/pricing.js";
import { parseModel } from "./model.js";
import { getProviderCircuitStatus } from "./providerCircuitBreaker.js";

const latencyByModel = new Map();
const quotaByProvider = new Map();

const WEIGHTS = Object.freeze({
  auto: Object.freeze({ quota: 0.1429, health: 0.1605, costInv: 0.1429, latencyInv: 0.1143 }),
  "auto/fast": Object.freeze({ quota: 0.1333, health: 0.2667, costInv: 0.0476, latencyInv: 0.3048 }),
  "auto/cheap": Object.freeze({ quota: 0.1333, health: 0.181, costInv: 0.3524, latencyInv: 0.0476 }),
  "quota-aware": Object.freeze({ quota: 0.3524, health: 0.2667, costInv: 0.0952, latencyInv: 0.0476 }),
});

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeHigher(value, values) {
  const known = values.filter((item) => item !== null);
  if (value === null || known.length === 0) return 0.5;
  const min = Math.min(...known);
  const max = Math.max(...known);
  if (max === min) return 1;
  return (value - min) / (max - min);
}

function normalizeLower(value, values) {
  return 1 - normalizeHigher(value, values);
}

function extractRemainingPercentages(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    value.forEach((item) => extractRemainingPercentages(item, output));
    return output;
  }

  const direct = finiteOrNull(value.remainingPercentage);
  if (direct !== null) output.push(Math.max(0, Math.min(100, direct)));
  else {
    const remaining = finiteOrNull(value.remaining);
    const total = finiteOrNull(value.total);
    if (remaining !== null && total !== null && total > 0) {
      output.push(Math.max(0, Math.min(100, (remaining / total) * 100)));
    }
  }

  Object.values(value).forEach((item) => {
    if (item && typeof item === "object") extractRemainingPercentages(item, output);
  });
  return output;
}

export function recordProviderQuotaSnapshot(provider, usage, now = Date.now()) {
  if (!provider) return null;
  const percentages = extractRemainingPercentages(usage);
  if (percentages.length === 0) return null;
  const remainingPercentage = Math.min(...percentages);
  quotaByProvider.set(provider, { remainingPercentage, updatedAt: now });
  return remainingPercentage;
}

export function recordModelLatency(model, latencyMs) {
  const value = finiteOrNull(latencyMs);
  if (!model || value === null || value < 0) return;
  const previous = latencyByModel.get(model);
  latencyByModel.set(model, previous === undefined ? value : previous * 0.7 + value * 0.3);
}

function candidateFor(model) {
  const parsed = parseModel(model);
  const pricing = getPricingForModel(parsed.provider, parsed.model);
  const input = finiteOrNull(pricing?.input);
  const output = finiteOrNull(pricing?.output);
  const cost = input === null || output === null ? null : input + output;
  const quota = quotaByProvider.get(parsed.provider)?.remainingPercentage ?? null;
  const latency = finiteOrNull(latencyByModel.get(model));
  const circuit = getProviderCircuitStatus(parsed.provider);

  return {
    model,
    provider: parsed.provider,
    quota,
    latency,
    cost,
    health: circuit.state === "CLOSED" ? 1 : circuit.state === "HALF_OPEN" ? 0.5 : 0,
  };
}

export function rankModelsForStrategy(models, strategy) {
  const weights = WEIGHTS[strategy];
  if (!weights || !Array.isArray(models) || models.length < 2) return [...(models || [])];

  const candidates = models.map(candidateFor);
  const quotas = candidates.map((item) => item.quota);
  const latencies = candidates.map((item) => item.latency);
  const costs = candidates.map((item) => item.cost);
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0);

  return candidates
    .map((candidate, index) => {
      const score = (
        normalizeHigher(candidate.quota, quotas) * weights.quota +
        candidate.health * weights.health +
        normalizeLower(candidate.cost, costs) * weights.costInv +
        normalizeLower(candidate.latency, latencies) * weights.latencyInv
      ) / weightTotal;
      return { ...candidate, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((candidate) => candidate.model);
}

export function getRoutingIntelligenceSnapshot() {
  return {
    latencyByModel: Object.fromEntries(latencyByModel),
    quotaByProvider: Object.fromEntries(quotaByProvider),
  };
}

export function resetRoutingIntelligence() {
  latencyByModel.clear();
  quotaByProvider.clear();
}
