import { DefaultExecutor } from "./default.js";
import { refreshWorkbuddyToken } from "../services/tokenRefresh/providers.js";
import { ROLE } from "../translator/schema/roles.js";

const WORKBUDDY_SYSTEM_PROMPT = "You are WorkBuddy.";

export class WorkBuddyExecutor extends DefaultExecutor {
  constructor() {
    super("workbuddy");
  }

  transformRequest(model, body, stream, credentials) {
    const transformed = super.transformRequest(model, body, stream, credentials);
    transformed.stream = true;

    // WorkBuddy requires every chat request to begin with a system message.
    if (Array.isArray(transformed.messages) && transformed.messages[0]?.role !== ROLE.SYSTEM) {
      transformed.messages = [
        { role: ROLE.SYSTEM, content: WORKBUDDY_SYSTEM_PROMPT },
        ...transformed.messages,
      ];
    }

    const eff = transformed.reasoning_effort;
    if (eff === "none" || eff === "off") {
      delete transformed.reasoning_effort;
    } else if (eff) {
      transformed.reasoning_summary = "auto";
    }

    return transformed;
  }

  async refreshCredentials(credentials, log) {
    return refreshWorkbuddyToken(credentials?.refreshToken, log);
  }

  buildHeaders(credentials, stream = true, url, model) {
    const headers = super.buildHeaders(credentials, stream, url, model);
    const providerData = credentials?.providerSpecificData || {};

    headers["X-Domain"] = providerData.domain || headers["X-Domain"] || "www.workbuddy.ai";
    if (providerData.uid) headers["X-User-Id"] = providerData.uid;
    else headers["X-No-User-Id"] = "true";
    if (providerData.enterpriseId) headers["X-Enterprise-Id"] = providerData.enterpriseId;
    else headers["X-No-Enterprise-Id"] = "true";
    if (credentials?.refreshToken) headers["X-Refresh-Token"] = credentials.refreshToken;

    return headers;
  }
}

export default WorkBuddyExecutor;
