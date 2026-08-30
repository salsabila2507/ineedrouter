import { nowSec } from "./_base.js";
import { storeGeneratedImage } from "./cache.js";

export const FREE_IMAGE_MODEL_IDS = new Set([
  "ineed/pollinations-image",
  "ineed/prexzy-image",
  "ineed/free-image",
]);

export const FREE_IMAGE_MODELS = [
  {
    id: "ineed/pollinations-image",
    object: "model",
    owned_by: "ineed",
    kind: "image",
    input: ["text"],
    output: ["image"],
  },
  {
    id: "ineed/prexzy-image",
    object: "model",
    owned_by: "ineed",
    kind: "image",
    input: ["text"],
    output: ["image"],
  },
  {
    id: "ineed/free-image",
    object: "model",
    owned_by: "ineed",
    kind: "image",
    input: ["text"],
    output: ["image"],
  },
];

export function resolveFreeImageModel(modelId) {
  if (modelId === "ineed/pollinations-image") {
    return { provider: "pollinations", model: "image" };
  }
  if (modelId === "ineed/prexzy-image") {
    return { provider: "prexzy", model: "image" };
  }
  if (modelId === "ineed/free-image") {
    return { provider: "ineed-free-image", model: "free-image" };
  }
  return null;
}

export function parseSize(size, fallback = { width: 1024, height: 1024 }) {
  if (typeof size !== "string") return fallback;
  const match = size.match(/^(\d{2,4})x(\d{2,4})$/);
  if (!match) return fallback;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height)) return fallback;
  if (width < 64 || height < 64 || width > 2048 || height > 2048) return fallback;
  return { width, height };
}

export function assertFreeImageRequest(body, { supportsN = false } = {}) {
  if (typeof body.prompt !== "string" || body.prompt.trim() === "") {
    throw new Error("Missing required field: prompt");
  }
  if (body.prompt.length > 4000) {
    throw new Error("Prompt exceeds maximum length of 4000 characters");
  }
  const n = body.n === undefined ? 1 : Number(body.n);
  if (!Number.isInteger(n) || n < 1 || n > 4) {
    throw new Error("n must be an integer between 1 and 4");
  }
  if (!supportsN && n !== 1) {
    throw new Error("This image provider supports n=1 only");
  }
  return { prompt: body.prompt.trim(), n };
}

export function jsonImageResponse(urls) {
  return {
    created: nowSec(),
    data: urls.map((url) => ({ url })),
  };
}

export async function imageBytesToProxyUrl(response, publicBaseUrl) {
  if (!publicBaseUrl) {
    throw new Error("Image byte proxy base URL is unavailable");
  }
  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Expected image bytes, received ${contentType}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error("Provider returned an empty image");
  }
  const id = storeGeneratedImage({ bytes, contentType });
  return `${publicBaseUrl.replace(/\/$/, "")}/v1/images/${id}`;
}

export function extractImageUrl(payload) {
  if (!payload || typeof payload !== "object") return null;

  const candidates = [
    payload.url,
    payload.image_url,
    payload.imageUrl,
    payload.image,
    payload.output,
    payload.result?.url,
    payload.result?.image_url,
    payload.result?.imageUrl,
    payload.result?.data?.url,
    payload.result?.data?.image_url,
    payload.data?.url,
    payload.data?.image_url,
    payload.data?.imageUrl,
  ];

  if (Array.isArray(payload.data)) {
    for (const item of payload.data) candidates.push(item?.url, item?.image_url, item?.imageUrl);
  }

  return candidates.find((value) => typeof value === "string" && /^https?:\/\//i.test(value)) || null;
}
