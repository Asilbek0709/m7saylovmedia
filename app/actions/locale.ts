"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

/**
 * Переключение языка. Кука читается в i18n/request.ts, поэтому после
 * router.refresh() сервер отдаёт разметку уже на новом языке.
 */
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
