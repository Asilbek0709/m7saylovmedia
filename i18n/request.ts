import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./config";

export default getRequestConfig(async ({ locale: explicit }) => {
  // Явно запрошенный язык (getTranslations({ locale })) — для значков и
  // картинок, которые просят конкретный язык; иначе — язык из куки.
  const store = await cookies();
  const candidate = explicit ?? store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(candidate) ? candidate : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
