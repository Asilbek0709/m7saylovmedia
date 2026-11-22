import { getLocale } from "next-intl/server";

import { HTML_LANG, isLocale, DEFAULT_LOCALE } from "@/i18n/config";

/**
 * Длинная дата на языке интерфейса; формат — по HTML_LANG
 * (узбекский — латиница, uz-Latn): «6-oktabr, 2026».
 */
export async function getLongDateFormatter(): Promise<(date: Date | string) => string> {
  const locale = await getLocale();
  const format = new Intl.DateTimeFormat(
    HTML_LANG[isLocale(locale) ? locale : DEFAULT_LOCALE],
    { dateStyle: "long" },
  );

  return (date) =>
    format.format(
      typeof date === "string" ? new Date(`${date}T00:00:00`) : date,
    );
}
