// WorkBuddy browser-login provider. The upstream is not OpenAI-compatible at
// /v1, but its plugin API accepts OpenAI-style chat bodies on /v2/chat/completions.
export default {
  id: "workbuddy",
  alias: "wb",
  uiAlias: "wb",
  hidden: false,
  priority: 91,
  display: {
    name: "WorkBuddy",
    icon: "work",
    color: "#1F8A70",
    website: "https://www.workbuddy.ai",
    notice: {
      signupUrl: "https://www.workbuddy.ai",
    },
  },
  category: "oauth",
  authModes: ["oauth"],
  hasOAuth: true,
  transport: {
    baseUrl: "https://www.workbuddy.ai/v2/chat/completions",
    forceStream: true,
    thinkingFormat: "openai",
    headers: {
      "User-Agent": "CLI/2.136.0 CodeBuddy/2.136.0",
      "X-Product": "SaaS",
      "X-IDE-Type": "CLI",
      "X-IDE-Name": "CLI",
      "X-Requested-With": "XMLHttpRequest",
      "X-Domain": "www.workbuddy.ai",
      Origin: "https://www.workbuddy.ai",
      Referer: "https://www.workbuddy.ai/",
    },
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
  },
  models: [],
  oauth: {
    baseUrl: "https://www.workbuddy.ai",
    stateUrl: "https://www.workbuddy.ai/v2/plugin/auth/state",
    tokenUrl: "https://www.workbuddy.ai/v2/plugin/auth/token",
    refreshUrl: "https://www.workbuddy.ai/v2/plugin/auth/token/refresh",
    accountUrl: "https://www.workbuddy.ai/v2/plugin/login/account",
    configUrl: "https://www.workbuddy.ai/v3/config",
    userAgent: "CLI/2.136.0 CodeBuddy/2.136.0",
    platform: "CLI",
    domain: "www.workbuddy.ai",
    pollInterval: 5000,
  },
  features: {
    usage: false,
  },
};
