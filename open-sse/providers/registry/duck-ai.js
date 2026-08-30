export default {
  id: "duck-ai",
  alias: "ineed",
  aliases: ["duckai", "duck-ai", "duck"],
  uiAlias: "ineed",
  priority: 35,
  display: {
    name: "Duck.ai Bridge",
    icon: "chat",
    color: "#DE5833",
    textIcon: "DA",
    website: "https://github.com/amirkabiri/duckai",
    notice: {
      apiKeyUrl: "https://github.com/amirkabiri/duckai",
    },
  },
  category: "apikey",
  authType: "apikey",
  authModes: ["apikey"],
  hasProviderSpecificData: true,
  transport: {
    baseUrl: "http://localhost:3000/v1/chat/completions",
    validateUrl: "http://localhost:3000/v1/models",
  },
  models: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (Duck.ai)" },
    { id: "gpt-5-mini", name: "GPT-5 Mini (Duck.ai)" },
    { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku Latest (Duck.ai)" },
    { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", name: "Llama 4 Scout 17B 16E Instruct (Duck.ai)" },
    { id: "mistralai/Mistral-Small-24B-Instruct-2501", name: "Mistral Small 24B Instruct 2501 (Duck.ai)" },
    { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (Duck.ai)" },
  ],
  passthroughModels: true,
};
