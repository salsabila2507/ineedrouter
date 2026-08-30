export default {
  id: "nous",
  alias: "nous",
  uiAlias: "nous",
  hidden: false,
  priority: 92,
  display: {
    name: "Nous Portal",
    icon: "hub",
    color: "#7C3AED",
    website: "https://portal.nousresearch.com",
    notice: {
      signupUrl: "https://portal.nousresearch.com/manage-subscription",
      apiKeyUrl: "https://portal.nousresearch.com/api-keys",
    },
  },
  category: "oauth",
  authModes: ["oauth", "apikey"],
  hasOAuth: true,
  transport: {
    baseUrl: "https://inference-api.nousresearch.com/v1/chat/completions",
    forceStream: true,
    headers: {
      "User-Agent": "iNeedRouter/0.5.55",
    },
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
  },
  models: [],
  oauth: {
    baseUrl: "https://portal.nousresearch.com",
    inferenceBaseUrl: "https://inference-api.nousresearch.com/v1",
    deviceCodeUrl: "https://portal.nousresearch.com/api/oauth/device/code",
    tokenUrl: "https://portal.nousresearch.com/api/oauth/token",
    clientId: "hermes-cli",
    scopes: "inference:invoke",
    pollInterval: 5000,
  },
  features: {
    usage: false,
  },
};
