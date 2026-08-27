import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
  };
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  return rowToKey(row);
}

export async function createApiKey(name, machineId) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId);
  const apiKey = {
    id: uuidv4(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
    [apiKey.id, apiKey.key, apiKey.name, apiKey.machineId, 1, apiKey.createdAt]
  );
  return apiKey;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const merged = { ...rowToKey(row), ...data };
    db.run(
      `UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ? WHERE id = ?`,
      [merged.key, merged.name, merged.machineId, merged.isActive ? 1 : 0, id]
    );
    result = merged;
  });
  return result;
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

export async function validateApiKey(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT isActive FROM apiKeys WHERE key = ?`, [key]);
  if (!row) return false;
  return row.isActive === 1 || row.isActive === true;
}


export async function getResellerKeyContext(key) { const db = await getAdapter(); return db.get(`SELECT k.id AS apiKeyId, k.isActive AS keyActive, m.tenantId, m.customerId, c.name AS customerName, c.status AS customerStatus, c.quotaTokens, c.quotaUsedTokens, p.monthlyTokenLimit, p.requestsPerMinute, p.isActive AS planActive FROM apiKeys k JOIN resellerKeyMeta m ON m.apiKeyId = k.id JOIN resellerCustomers c ON c.id = m.customerId LEFT JOIN resellerPlans p ON p.id = c.planId WHERE k.key = ?`, [key]); }

export async function authorizeResellerRequest(key, estimatedTokens = 1) { const ctx = await getResellerKeyContext(key); if (!ctx) return { enforced: false }; if (!ctx.keyActive || ctx.customerStatus !== "active" || (ctx.planActive ?? 1) !== 1) return { enforced: true, ok: false, code: "ACCOUNT_DISABLED" }; const now = Date.now(), windowStart = now - (now % 60000), bucketKey = ctx.apiKeyId + ":" + windowStart, db = await getAdapter(), limit = Number(ctx.requestsPerMinute || 60); let denied = false; db.transaction(() => { const b = db.get(`SELECT requestCount FROM resellerRateBuckets WHERE bucketKey = ?`, [bucketKey]); const tokenLimit = Number(ctx.monthlyTokenLimit || ctx.quotaTokens || 0); if ((b?.requestCount || 0) >= limit || (tokenLimit > 0 && Number(ctx.quotaUsedTokens || 0) + estimatedTokens > tokenLimit)) { denied = true; return; } db.run(`INSERT INTO resellerRateBuckets(bucketKey, windowStart, requestCount) VALUES(?, ?, 1) ON CONFLICT(bucketKey) DO UPDATE SET requestCount = requestCount + 1`, [bucketKey, windowStart]); db.run(`UPDATE resellerCustomers SET quotaUsedTokens = quotaUsedTokens + ?, updatedAt = ? WHERE id = ?`, [estimatedTokens, new Date().toISOString(), ctx.customerId]); db.run(`INSERT INTO resellerLedger(id, tenantId, customerId, apiKeyId, kind, tokens, status, metadata, createdAt) VALUES(?, ?, ?, ?, "usage", ?, "posted", ?, ?)`, [uuidv4(), ctx.tenantId, ctx.customerId, ctx.apiKeyId, estimatedTokens, JSON.stringify({ estimate: true }), new Date().toISOString()]); db.run(`UPDATE resellerKeyMeta SET lastUsedAt = ? WHERE apiKeyId = ?`, [new Date().toISOString(), ctx.apiKeyId]); }); return denied ? { enforced: true, ok: false, code: "LIMIT_EXCEEDED" } : { enforced: true, ok: true, context: ctx }; }


export async function recordResellerUsage(key, tokens, amountCents = 0, metadata = {}) { const ctx = await getResellerKeyContext(key); if (!ctx) return false; const total = Number(tokens || 0); if (total <= 0 && Number(amountCents || 0) <= 0) return false; const db = await getAdapter(); db.run(`INSERT INTO resellerLedger(id, tenantId, customerId, apiKeyId, kind, amountCents, tokens, status, metadata, createdAt) VALUES(?, ?, ?, ?, "usage_actual", ?, ?, "posted", ?, ?)`, [uuidv4(), ctx.tenantId, ctx.customerId, ctx.apiKeyId, Number(amountCents || 0), total, JSON.stringify(metadata), new Date().toISOString()]); return true; }
