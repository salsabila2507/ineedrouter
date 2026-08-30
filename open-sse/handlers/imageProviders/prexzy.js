import { assertFreeImageRequest, extractImageUrl, jsonImageResponse, parseSize } from "./freeProviders.js";

const TIMEOUT_MS = 45000;
const BASE_URL = "https://prexzyapis.com";

function buildAIWriterUrl(body) {
  const { prompt } = assertFreeImageRequest(body);
  const { width, height } = parseSize(body.size);
  const url = new URL("/ai/aiwriter-image", BASE_URL);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("size", `${width}x${height}`);
  return url.toString();
}

function buildGenImageUrl(body) {
  const { prompt } = assertFreeImageRequest(body);
  const { width, height } = parseSize(body.size);
  const url = new URL("/ai/genimage", BASE_URL);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  return url.toString();
}

async function parseJsonResponse(response, endpointName) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${endpointName} returned ${contentType || "non-JSON"} instead of JSON`);
  }
  const payload = await response.json();
  const url = extractImageUrl(payload);
  if (!url) {
    throw new Error(`${endpointName} response did not include an image URL`);
  }
  return jsonImageResponse([url]);
}

export const prexzyAIWriter = {
  noAuth: true,
  timeoutMs: TIMEOUT_MS,
  method: "GET",
  buildUrl: (_model, _credentials, body) => buildAIWriterUrl(body),
  buildHeaders: () => ({}),
  buildBody: async () => null,
  parseResponse: (response) => parseJsonResponse(response, "Prexzy aiwriter-image"),
  normalize: (responseBody) => responseBody,
};

export const prexzyGenImage = {
  noAuth: true,
  timeoutMs: TIMEOUT_MS,
  method: "GET",
  buildUrl: (_model, _credentials, body) => buildGenImageUrl(body),
  buildHeaders: () => ({}),
  buildBody: async () => null,
  parseResponse: (response) => parseJsonResponse(response, "Prexzy genimage"),
  normalize: (responseBody) => responseBody,
};

const prexzy = {
  noAuth: true,
  timeoutMs: TIMEOUT_MS,
  fallbackProviders: ["prexzy-aiwriter", "prexzy-genimage"],
};

export default prexzy;
