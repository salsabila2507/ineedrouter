import { randomUUID } from "crypto";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ITEMS = 100;
const imageCache = new Map();

function cleanup(now = Date.now()) {
  for (const [id, item] of imageCache.entries()) {
    if (item.expiresAt <= now) imageCache.delete(id);
  }
  while (imageCache.size > MAX_CACHE_ITEMS) {
    const oldestKey = imageCache.keys().next().value;
    if (!oldestKey) break;
    imageCache.delete(oldestKey);
  }
}

export function storeGeneratedImage({ bytes, contentType = "image/png" }) {
  cleanup();
  const id = randomUUID();
  imageCache.set(id, {
    bytes,
    contentType,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return id;
}

export function getGeneratedImage(id) {
  cleanup();
  const item = imageCache.get(id);
  if (!item) return null;
  return item;
}
