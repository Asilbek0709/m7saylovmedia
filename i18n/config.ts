export const LOCALES = ["uz", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";


export const LOCALE_COOKIE = "ms7-locale";

export const LOCALE_LABELS: Record<Locale, { native: string; short: string }> =
  {
    uz: { native: "O'zbekcha", short: "UZ" },
    ru: { native: "Русский", short: "RU" },
    en: { native: "English", short: "EN" },
  };


export const HTML_LANG: Record<Locale, string> = {
  uz: "uz-Cyrl",
  ru: "ru",
  en: "en",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}
