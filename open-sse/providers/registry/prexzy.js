export default {
  id: "prexzy",
  priority: 131,
  alias: "prexzy",
  display: {
    name: "Prexzy",
    icon: "image",
    color: "#0EA5E9",
    textIcon: "PX",
    website: "https://prexzyapis.com",
  },
  category: "free",
  transport: null,
  models: [
    { id: "image", name: "Prexzy Image", params: ["prompt", "size", "n"], kind: "image" },
  ],
  serviceKinds: ["image"],
  imageConfig: { baseUrl: "https://prexzyapis.com" },
};
