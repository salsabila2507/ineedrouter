import { assertFreeImageRequest, imageBytesToProxyUrl, jsonImageResponse, parseSize } from "./freeProviders.js";

const TIMEOUT_MS = 45000;

const pollinations = {
  noAuth: true,
  timeoutMs: TIMEOUT_MS,
  method: "GET",
  buildUrl: (_model, _credentials, body) => {
    const { prompt } = assertFreeImageRequest(body);
    const { width, height } = parseSize(body.size);
    const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(height));
    return url.toString();
  },
  buildHeaders: () => ({}),
  buildBody: async () => null,
  parseResponse: async (response, { publicBaseUrl }) => {
    const url = await imageBytesToProxyUrl(response, publicBaseUrl);
    return jsonImageResponse([url]);
  },
  normalize: (responseBody) => responseBody,
};

export default pollinations;
