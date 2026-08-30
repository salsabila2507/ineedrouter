import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleImageGenerationCore } from "../../open-sse/handlers/imageGenerationCore.js";
import { getGeneratedImage } from "../../open-sse/handlers/imageProviders/cache.js";

const originalFetch = global.fetch;

describe("free image providers", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("normalizes Pollinations image bytes through the local proxy cache", async () => {
    global.fetch.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "image/jpeg" },
    }));

    const result = await handleImageGenerationCore({
      body: { prompt: "anime city at night", size: "1024x1024", n: 1 },
      modelInfo: { provider: "pollinations", model: "image" },
      credentials: null,
      publicBaseUrl: "http://localhost:20127",
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://image.pollinations.ai/prompt/anime%20city%20at%20night?width=1024&height=1024",
      expect.objectContaining({ method: "GET", body: undefined })
    );

    const body = await result.response.json();
    expect(body.data[0].url).toMatch(/^http:\/\/localhost:20127\/v1\/images\//);
    const id = body.data[0].url.split("/").pop();
    expect(getGeneratedImage(id).contentType).toBe("image/jpeg");
  });

  it("normalizes Prexzy aiwriter-image JSON response", async () => {
    global.fetch.mockResolvedValueOnce(Response.json({
      status: true,
      result: { data: { url: "https://cdn.example/aiwriter.png" } },
    }));

    const result = await handleImageGenerationCore({
      body: { prompt: "forest temple", size: "512x512", n: 1 },
      modelInfo: { provider: "prexzy-aiwriter", model: "image" },
      credentials: null,
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://prexzyapis.com/ai/aiwriter-image?prompt=forest+temple&size=512x512",
      expect.objectContaining({ method: "GET" })
    );
    await expect(result.response.json()).resolves.toMatchObject({
      data: [{ url: "https://cdn.example/aiwriter.png" }],
    });
  });

  it("normalizes Prexzy genimage JSON response", async () => {
    global.fetch.mockResolvedValueOnce(Response.json({ image_url: "https://cdn.example/gen.png" }));

    const result = await handleImageGenerationCore({
      body: { prompt: "forest temple", size: "256x256", n: 1 },
      modelInfo: { provider: "prexzy-genimage", model: "image" },
      credentials: null,
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://prexzyapis.com/ai/genimage?prompt=forest+temple&width=256&height=256",
      expect.objectContaining({ method: "GET" })
    );
    await expect(result.response.json()).resolves.toMatchObject({
      data: [{ url: "https://cdn.example/gen.png" }],
    });
  });

  it("uses Prexzy aiwriter-image then genimage for the Prexzy public model", async () => {
    global.fetch
      .mockResolvedValueOnce(new Response("bad", { status: 502 }))
      .mockResolvedValueOnce(Response.json({ image_url: "https://cdn.example/fallback.png" }));

    const result = await handleImageGenerationCore({
      body: { prompt: "fallback", n: 1 },
      modelInfo: { provider: "prexzy", model: "image" },
      credentials: null,
    });

    expect(result.success).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toContain("/ai/aiwriter-image?");
    expect(global.fetch.mock.calls[1][0]).toContain("/ai/genimage?");
  });

  it("uses Pollinations then Prexzy for ineed/free-image fallback", async () => {
    global.fetch
      .mockResolvedValueOnce(new Response("timeout", { status: 504 }))
      .mockResolvedValueOnce(Response.json({ result: { data: { url: "https://cdn.example/free.png" } } }));

    const result = await handleImageGenerationCore({
      body: { prompt: "fallback", n: 1 },
      modelInfo: { provider: "ineed-free-image", model: "free-image" },
      credentials: null,
      publicBaseUrl: "http://localhost:20127",
    });

    expect(result.success).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toContain("image.pollinations.ai");
    expect(global.fetch.mock.calls[1][0]).toContain("/ai/aiwriter-image?");
  });

  it("rejects missing prompt", async () => {
    const result = await handleImageGenerationCore({
      body: { n: 1 },
      modelInfo: { provider: "pollinations", model: "image" },
      credentials: null,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });

  it("rejects unknown image provider", async () => {
    const result = await handleImageGenerationCore({
      body: { prompt: "test" },
      modelInfo: { provider: "missing-provider", model: "image" },
      credentials: null,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });

  it("reports upstream timeout", async () => {
    vi.useFakeTimers();
    global.fetch.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));

    const pending = handleImageGenerationCore({
      body: { prompt: "slow", n: 1 },
      modelInfo: { provider: "pollinations", model: "image" },
      credentials: null,
      publicBaseUrl: "http://localhost:20127",
    });

    await vi.advanceTimersByTimeAsync(45001);
    const result = await pending;
    expect(result.success).toBe(false);
    expect(result.status).toBe(502);
    expect(result.error).toContain("timed out");
  });

  it("reports upstream HTTP error", async () => {
    global.fetch.mockResolvedValueOnce(Response.json({ error: "rate limited" }, { status: 429 }));

    const result = await handleImageGenerationCore({
      body: { prompt: "test", n: 1 },
      modelInfo: { provider: "prexzy-aiwriter", model: "image" },
      credentials: null,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(429);
  });

  it("reports malformed provider response", async () => {
    global.fetch.mockResolvedValueOnce(Response.json({ status: true }));

    const result = await handleImageGenerationCore({
      body: { prompt: "test", n: 1 },
      modelInfo: { provider: "prexzy-aiwriter", model: "image" },
      credentials: null,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(502);
    expect(result.error).toContain("image URL");
  });

  it("URL-encodes prompts", async () => {
    global.fetch.mockResolvedValueOnce(new Response(new Uint8Array([1]), {
      status: 200,
      headers: { "Content-Type": "image/png" },
    }));

    await handleImageGenerationCore({
      body: { prompt: "a/b city & rain", n: 1 },
      modelInfo: { provider: "pollinations", model: "image" },
      credentials: null,
      publicBaseUrl: "http://localhost:20127",
    });

    expect(global.fetch.mock.calls[0][0]).toContain("a%2Fb%20city%20%26%20rain");
  });

  it("maps OpenAI sizes to upstream dimensions", async () => {
    global.fetch.mockResolvedValueOnce(Response.json({ image_url: "https://cdn.example/sized.png" }));

    await handleImageGenerationCore({
      body: { prompt: "size", size: "512x512", n: 1 },
      modelInfo: { provider: "prexzy-genimage", model: "image" },
      credentials: null,
    });

    expect(global.fetch.mock.calls[0][0]).toContain("width=512&height=512");
  });

  it("rejects unsupported n values", async () => {
    const result = await handleImageGenerationCore({
      body: { prompt: "two", n: 2 },
      modelInfo: { provider: "prexzy-aiwriter", model: "image" },
      credentials: null,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });
});
