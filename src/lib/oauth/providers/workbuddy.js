import { WORKBUDDY_CONFIG } from "../constants/oauth.js";

const buildBrowserHeaders = (config, extra = {}) => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": config.userAgent,
  "X-Requested-With": "XMLHttpRequest",
  "X-Domain": config.domain,
  "X-Product": "SaaS",
  Origin: config.baseUrl,
  Referer: `${config.baseUrl}/`,
  ...extra,
});

async function fetchAccount(config, state, accessToken) {
  if (!config.accountUrl || !accessToken) return {};
  const response = await fetch(`${config.accountUrl}?state=${encodeURIComponent(state)}`, {
    method: "GET",
    headers: buildBrowserHeaders(config, {
      Authorization: `Bearer ${accessToken}`,
    }),
  });
  if (!response.ok) return {};
  const payload = await response.json().catch(() => ({}));
  const data = payload?.data || payload || {};
  return {
    uid: data.uid || data.userId || data.user_id || data.id || data.accountId || null,
    enterpriseId: data.enterpriseId || data.enterprise_id || data.companyId || data.company_id || null,
    email: data.email || data.mail || null,
    displayName: data.nickname || data.name || data.displayName || null,
  };
}

const workbuddy = {
  config: WORKBUDDY_CONFIG,
  flowType: "device_code",
  requestDeviceCode: async (config) => {
    const response = await fetch(`${config.stateUrl}?platform=${encodeURIComponent(config.platform)}`, {
      method: "POST",
      headers: buildBrowserHeaders(config, {
        "X-No-Authorization": "true",
        "X-No-User-Id": "true",
      }),
      body: "{}",
    });
    if (!response.ok) throw new Error(`WorkBuddy state request failed: ${await response.text()}`);
    const data = await response.json();
    if (data.code !== 0 || !data.data?.state || !data.data?.authUrl) {
      throw new Error(`WorkBuddy state error: ${data.msg || "missing state/authUrl"}`);
    }
    return {
      device_code: data.data.state,
      verification_uri: data.data.authUrl,
      user_code: "",
      interval: config.pollInterval / 1000,
      _isWorkBuddy: true,
    };
  },
  pollToken: async (config, deviceCode) => {
    const response = await fetch(`${config.tokenUrl}?state=${encodeURIComponent(deviceCode)}`, {
      method: "GET",
      headers: buildBrowserHeaders(config, {
        "X-No-Authorization": "true",
        "X-No-User-Id": "true",
        "X-No-Enterprise-Id": "true",
        "X-No-Department-Info": "true",
      }),
    });
    if (!response.ok) return { ok: false, data: { error: "request_failed" } };
    const data = await response.json();
    if (data.code === 0 && data.data?.accessToken) {
      const account = await fetchAccount(config, deviceCode, data.data.accessToken);
      return {
        ok: true,
        data: {
          access_token: data.data.accessToken,
          refresh_token: data.data.refreshToken || "",
          token_type: data.data.tokenType || "Bearer",
          expires_in: data.data.expiresIn,
          email: account.email,
          display_name: account.displayName,
          provider_specific_data: {
            uid: account.uid,
            enterpriseId: account.enterpriseId,
            domain: config.domain,
          },
        },
      };
    }
    if (data.code === 11217) return { ok: true, data: { error: "authorization_pending" } };
    return { ok: false, data: { error: data.msg || "unknown_error" } };
  },
  mapTokens: (tokens) => ({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in || 86400,
    email: tokens.email || null,
    displayName: tokens.display_name || null,
    providerSpecificData: Object.fromEntries(
      Object.entries(tokens.provider_specific_data || {}).filter(([, value]) => value)
    ),
  }),
};

export default workbuddy;
