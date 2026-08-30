import { buildClineCliHeaders } from "../shared/clineAuth.js";

const CLINE_FREE_MODELS_ENDPOINT = "https://api.cline.bot/api/v1/ai/cline/recommended-models";
const FETCH_TIMEOUT_MS = 5000;

/**
 * Fetch the official free-model catalog used by the regular Cline CLI picker.
 */
export async function resolveClineModels(credentials) {
  const token = credentials?.accessToken;
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(CLINE_FREE_MODELS_ENDPOINT, {
      method: "GET",
      headers: buildClineCliHeaders(token, { Accept: "application/json" }),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const json = await response.json();
    const rawList = json?.free;
    if (!Array.isArray(rawList)) return null;

    const seen = new Set();
    const models = rawList.flatMap((model) => {
      const id = typeof model?.id === "string" ? model.id.trim() : "";
      if (!id || seen.has(id)) return [];
      seen.add(id);
      return [{ ...model, id, name: model.name || id }];
    });

    return models.length ? { models } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
