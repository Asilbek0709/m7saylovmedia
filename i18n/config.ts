export const LOCALES = ["uz", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

/**
 * Язык хранится в куке, а не в сегменте URL. Для MVP это осознанный выбор:
 * не нужен proxy/middleware (в Next 16 middleware переименован в proxy),
 * маршруты остаются плоскими, а переключение — это server action + refresh.
 */
export const LOCALE_COOKIE = "ms7-locale";

export const LOCALE_LABELS: Record<Locale, { native: string; short: string }> =
  {
    uz: { native: "O'zbekcha", short: "UZ" },
    ru: { native: "Русский", short: "RU" },
    en: { native: "English", short: "EN" },
  };

/** Тег для атрибута lang — узбекский интерфейс набран кириллицей. */
export const HTML_LANG: Record<Locale, string> = {
  uz: "uz-Cyrl",
  ru: "ru",
  en: "en",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}
