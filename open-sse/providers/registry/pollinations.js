export default {
  id: "pollinations",
  priority: 130,
  alias: "pollinations",
  display: {
    name: "Pollinations",
    icon: "image",
    color: "#10B981",
    textIcon: "PL",
    website: "https://image.pollinations.ai",
  },
  category: "free",
  transport: null,
  models: [
    { id: "image", name: "Pollinations Image", params: ["prompt", "size", "n"], kind: "image" },
  ],
  serviceKinds: ["image"],
  imageConfig: { baseUrl: "https://image.pollinations.ai/prompt" },
};
