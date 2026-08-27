import { PROVIDER_CIRCUIT_BREAKER } from "../config/errorConfig.js";

export const PROVIDER_CIRCUIT_STATE = Object.freeze({
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
});

const breakers = new Map();
const failureStatuses = new Set(PROVIDER_CIRCUIT_BREAKER.failureStatuses);

function newBreaker() {
  return {
    state: PROVIDER_CIRCUIT_STATE.CLOSED,
    failureCount: 0,
    lastFailureAt: null,
    halfOpenRemaining: PROVIDER_CIRCUIT_BREAKER.halfOpenRequests,
  };
}

function getBreaker(provider) {
  if (!breakers.has(provider)) breakers.set(provider, newBreaker());
  return breakers.get(provider);
}

function refreshState(breaker, now) {
  if (
    breaker.state === PROVIDER_CIRCUIT_STATE.OPEN &&
    breaker.lastFailureAt !== null &&
    now - breaker.lastFailureAt >= PROVIDER_CIRCUIT_BREAKER.resetTimeoutMs
  ) {
    breaker.state = PROVIDER_CIRCUIT_STATE.HALF_OPEN;
    breaker.halfOpenRemaining = PROVIDER_CIRCUIT_BREAKER.halfOpenRequests;
  }
}

function retryAfterMs(breaker, now) {
  if (breaker.state !== PROVIDER_CIRCUIT_STATE.OPEN || breaker.lastFailureAt === null) return 0;
  return Math.max(
    0,
    PROVIDER_CIRCUIT_BREAKER.resetTimeoutMs - (now - breaker.lastFailureAt),
  );
}

export function isProviderFailureStatus(status) {
  return failureStatuses.has(Number(status));
}

export function canUseProvider(provider, now = Date.now()) {
  const breaker = getBreaker(provider);
  refreshState(breaker, now);

  if (breaker.state === PROVIDER_CIRCUIT_STATE.OPEN) {
    return {
      allowed: false,
      state: breaker.state,
      isProbe: false,
      retryAfterMs: retryAfterMs(breaker, now),
    };
  }

  if (breaker.state === PROVIDER_CIRCUIT_STATE.HALF_OPEN) {
    if (breaker.halfOpenRemaining <= 0) {
      return { allowed: false, state: breaker.state, isProbe: false, retryAfterMs: 0 };
    }
    breaker.halfOpenRemaining -= 1;
    return { allowed: true, state: breaker.state, isProbe: true, retryAfterMs: 0 };
  }

  return { allowed: true, state: breaker.state, isProbe: false, retryAfterMs: 0 };
}

export function recordProviderFailure(provider, status, now = Date.now()) {
  if (!provider || !isProviderFailureStatus(status)) return false;

  const breaker = getBreaker(provider);
  refreshState(breaker, now);
  breaker.lastFailureAt = now;

  if (breaker.state === PROVIDER_CIRCUIT_STATE.HALF_OPEN) {
    breaker.state = PROVIDER_CIRCUIT_STATE.OPEN;
    breaker.failureCount = PROVIDER_CIRCUIT_BREAKER.failureThreshold;
    breaker.halfOpenRemaining = 0;
    return true;
  }

  breaker.failureCount += 1;
  if (breaker.failureCount >= PROVIDER_CIRCUIT_BREAKER.failureThreshold) {
    breaker.state = PROVIDER_CIRCUIT_STATE.OPEN;
    breaker.halfOpenRemaining = 0;
    return true;
  }
  return false;
}

export function recordProviderSuccess(provider) {
  if (!provider) return;
  breakers.set(provider, newBreaker());
}

export function getProviderCircuitStatus(provider, now = Date.now()) {
  const breaker = getBreaker(provider);
  refreshState(breaker, now);
  return {
    provider,
    state: breaker.state,
    failureCount: breaker.failureCount,
    lastFailureAt: breaker.lastFailureAt,
    retryAfterMs: retryAfterMs(breaker, now),
  };
}

export function getAllProviderCircuitStatuses(now = Date.now()) {
  return [...breakers.keys()].map((provider) => getProviderCircuitStatus(provider, now));
}

export function resetProviderCircuitBreakers(provider = null) {
  if (provider) breakers.delete(provider);
  else breakers.clear();
}
