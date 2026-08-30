import { PROVIDER_OAUTH } from "../config/providers.js";

const oauth = PROVIDER_OAUTH.workbuddy || {};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function modelId(model) {
  return model?.id || model?.model || model?.name || model?.key || model?.modelName;
}

export function parseWorkbuddyModels(payload) {
  const data = payload?.data || payload || {};
  const modelEntries = [
    ...asArray(data.models),
    ...asArray(data.modelList),
    ...asArray(data.llmModels),
  ];
  const agents = [
    ...asArray(data.agents),
    ...asArray(data.agentList),
    ...asArray(data.agent?.agents),
  ];

  const cliAgent = agents.find((agent) => {
    const name = String(agent?.name || agent?.id || agent?.key || "").toLowerCase();
    return name === "cli" || name.includes("cli");
  });
  const allowedIds = new Set(asArray(cliAgent?.models).map((item) => typeof item === "string" ? item : modelId(item)).filter(Boolean));
  const sourceModels = modelEntries.length ? modelEntries : asArray(cliAgent?.models);

  return sourceModels
    .map((model) => {
      const id = typeof model === "string" ? model : modelId(model);
      if (!id || (allowedIds.size && !allowedIds.has(id))) return null;
      return {
        id,
        name: model?.displayName || model?.display_name || model?.label || model?.name || id,
        contextLength: model?.contextLength || model?.context_length || model?.maxInputTokens || model?.max_allowed_size,
        maxOutputTokens: model?.maxOutputTokens || model?.max_output_tokens,
        isVL: Boolean(model?.isVL || model?.vision || model?.supportsImages),
        isReasoning: Boolean(model?.isReasoning || model?.reasoning || model?.supportsReasoning),
        capabilities: model?.capabilities,
      };
    })
    .filter(Boolean);
}

export async function fetchWorkbuddyModels(credentials, { token } = {}) {
  const accessToken = token || credentials?.accessToken;
  const providerData = credentials?.providerSpecificData || {};
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": oauth.userAgent,
    "X-Requested-With": "XMLHttpRequest",
    "X-Domain": providerData.domain || oauth.domain || "www.workbuddy.ai",
    "X-Product": "SaaS",
  };
  if (providerData.uid) headers["X-User-Id"] = providerData.uid;
  if (providerData.enterpriseId) headers["X-Enterprise-Id"] = providerData.enterpriseId;
  if (credentials?.refreshToken) headers["X-Refresh-Token"] = credentials.refreshToken;

  return fetch(oauth.configUrl || "https://www.workbuddy.ai/v3/config", {
    method: "GET",
    headers,
  });
}
