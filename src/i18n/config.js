// Focused operator-console languages for the iNeedRouter distribution.
// The upstream translation runtime remains intact.
export const LOCALES = ["id", "en", "zh-CN"];
export const DEFAULT_LOCALE = "id";
export const LOCALE_COOKIE = "locale";

export const LOCALE_NAMES = {
  en: "English",
  vi: "Tiếng Việt",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português (Portugal)",
  ko: "한국어",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  he: "עברית",
  ar: "العربية",
  ru: "Русский",
  pl: "Polski",
  cs: "Čeština",
  nl: "Nederlands",
  tr: "Türkçe",
  uk: "Українська",
  tl: "Tagalog",
  id: "Indonesia",
  th: "ไทย",
  km: "ខ្មែរ",
  hi: "हिन्दी",
  bn: "বাংলা",
  ur: "اردو",
  ro: "Română",
  sv: "Svenska",
  it: "Italiano",
  el: "Ελληνικά",
  hu: "Magyar",
  fi: "Suomi",
  da: "Dansk",
  no: "Norsk",
  fa: "فارسی",
};

export function normalizeLocale(locale) {
  if (locale !== "zh" && !LOCALES.includes(locale)) {
    return DEFAULT_LOCALE;
  }
  if (locale === "zh" || locale === "zh-CN") {
    return "zh-CN";
  }
  if (locale === "en") {
    return "en";
  }
  if (locale === "vi") {
    return "vi";
  }
  if (locale === "zh-TW") {
    return "zh-TW";
  }
  if (locale === "ja") {
    return "ja";
  }
  if (locale === "pt-BR") {
    return "pt-BR";
  }
  if (locale === "pt-PT") {
    return "pt-PT";
  }
  if (locale === "ko") {
    return "ko";
  }
  if (locale === "es") {
    return "es";
  }
  if (locale === "de") {
    return "de";
  }
  if (locale === "fr") {
    return "fr";
  }
  if (locale === "he") {
    return "he";
  }
  if (locale === "ar") {
    return "ar";
  }
  if (locale === "ru") {
    return "ru";
  }
  if (locale === "pl") {
    return "pl";
  }
  if (locale === "cs") {
    return "cs";
  }
  if (locale === "nl") {
    return "nl";
  }
  if (locale === "tr") {
    return "tr";
  }
  if (locale === "uk") {
    return "uk";
  }
  if (locale === "tl") {
    return "tl";
  }
  if (locale === "id") {
    return "id";
  }
  if (locale === "th") {
    return "th";
  }
  if (locale === "km") {
    return "km";
  }
  if (locale === "hi") {
    return "hi";
  }
  if (locale === "bn") {
    return "bn";
  }
  if (locale === "ur") {
    return "ur";
  }
  if (locale === "ro") {
    return "ro";
  }
  if (locale === "sv") {
    return "sv";
  }
  if (locale === "it") {
    return "it";
  }
  if (locale === "el") {
    return "el";
  }
  if (locale === "hu") {
    return "hu";
  }
  if (locale === "fi") {
    return "fi";
  }
  if (locale === "da") {
    return "da";
  }
  if (locale === "no") {
    return "no";
  }
  if (locale === "fa") {
    return "fa";
  }
  return DEFAULT_LOCALE;
}

export function isSupportedLocale(locale) {
  return LOCALES.includes(locale);
}
