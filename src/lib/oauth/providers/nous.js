import { NOUS_CONFIG } from "../constants/oauth.js";

const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

const nous = {
  config: NOUS_CONFIG,
  flowType: "device_code",
  requestDeviceCode: async (config) => {
    const response = await fetch(config.deviceCodeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        scope: config.scopes,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Nous device code request failed: ${error}`);
    }

    return await response.json();
  },
  pollToken: async (config, deviceCode) => {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: DEVICE_GRANT,
        client_id: config.clientId,
        device_code: deviceCode,
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = { error: "invalid_response", error_description: await response.text().catch(() => "") };
    }

    return { ok: response.ok, data };
  },
  mapTokens: (tokens) => ({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresIn: tokens.expires_in,
    providerSpecificData: {
      tokenType: tokens.token_type || "Bearer",
      scope: tokens.scope || NOUS_CONFIG.scopes,
      inferenceBaseUrl: tokens.inference_base_url || NOUS_CONFIG.inferenceBaseUrl,
    },
  }),
};

export default nous;
