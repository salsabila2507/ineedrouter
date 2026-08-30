import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveClineModels } from "../../open-sse/services/clineModels.js";

describe("resolveClineModels", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns only the official regular Cline free-model catalog", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        free: [
          { id: "z-ai/glm-5.3-flash", name: "GLM 5.3 Flash" },
          { id: "deepseek/deepseek-v4-flash" },
          { id: "poolside/laguna-s-2.1:free" },
          { id: "z-ai/glm-5.3-flash", name: "duplicate" },
        ],
        recommended: [{ id: "openai/gpt-paid" }],
        clinePass: [{ id: "cline-pass/glm-5.2" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveClineModels({ accessToken: "oauth-token" });

    expect(result.models).toEqual([
      { id: "z-ai/glm-5.3-flash", name: "GLM 5.3 Flash" },
      { id: "deepseek/deepseek-v4-flash", name: "deepseek/deepseek-v4-flash" },
      { id: "poolside/laguna-s-2.1:free", name: "poolside/laguna-s-2.1:free" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cline.bot/api/v1/ai/cline/recommended-models",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: expect.any(String),
          "User-Agent": "Cline/3.0.60",
          "X-CLIENT-TYPE": "cline-cli",
          "X-CLIENT-VERSION": "3.0.60",
          "X-PLATFORM": "cli",
          "X-CORE-VERSION": "0.0.81",
          "X-Task-ID": expect.any(String),
        }),
      }),
    );
  });

  it("returns null without an OAuth token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveClineModels({})).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
