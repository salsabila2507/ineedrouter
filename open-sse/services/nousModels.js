export function parseNousModels(payload) {
  const raw = Array.isArray(payload) ? payload : payload?.data || payload?.models || [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((model) => {
      const id = model?.id || model?.model || model?.name;
      if (!id || !String(id).includes(":free")) return null;
      const inputModalities = model?.architecture?.input_modalities || [];
      return {
        id,
        name: model?.name || id,
        contextLength: model?.context_length || model?.top_provider?.context_length,
        maxOutputTokens: model?.top_provider?.max_completion_tokens,
        isVL: inputModalities.includes("image") || inputModalities.includes("video"),
        isReasoning: Boolean(model?.reasoning || model?.supported_parameters?.includes?.("reasoning")),
        capabilities: model?.supported_parameters
          ? { supportedParameters: model.supported_parameters, free: true }
          : { free: true },
      };
    })
    .filter(Boolean);
}

export async function fetchNousModels(credentials, { token } = {}) {
  const accessToken = token || credentials?.accessToken || credentials?.apiKey;
  const baseUrl = credentials?.providerSpecificData?.inferenceBaseUrl || "https://inference-api.nousresearch.com/v1";
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${baseUrl.replace(/\/$/, "")}/models`, { method: "GET", headers });
}
