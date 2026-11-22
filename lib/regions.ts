import type { Locale } from "@/i18n/config";
import { toLatin } from "@/lib/translit";

/**
 * Регионы хранятся в базе по-узбекски кириллицей — это ключ фильтра.
 * Здесь только подпись для показа: узбекский — латиницей, русский и
 * английский — по таблице; неизвестный регион показывается как есть.
 */
const LABELS: Record<string, { ru: string; en: string }> = {
  "Тошкент": { ru: "Ташкент", en: "Tashkent" },
  "Тошкент вилояти": { ru: "Ташкентская область", en: "Tashkent Region" },
  "Андижон": { ru: "Андижан", en: "Andijan" },
  "Бухоро": { ru: "Бухара", en: "Bukhara" },
  "Жиззах": { ru: "Джизак", en: "Jizzakh" },
  "Қашқадарё": { ru: "Кашкадарья", en: "Kashkadarya" },
  "Навоий": { ru: "Навои", en: "Navoi" },
  "Наманган": { ru: "Наманган", en: "Namangan" },
  "Самарқанд": { ru: "Самарканд", en: "Samarkand" },
  "Сирдарё": { ru: "Сырдарья", en: "Syrdarya" },
  "Сурхондарё": { ru: "Сурхандарья", en: "Surkhandarya" },
  "Фарғона": { ru: "Фергана", en: "Fergana" },
  "Хоразм": { ru: "Хорезм", en: "Khorezm" },
  "Қорақалпоғистон": { ru: "Каракалпакстан", en: "Karakalpakstan" },
};

/** Регионы в порядке показа в списках (ключи — как в базе). */
export const REGIONS = Object.keys(LABELS);

export function regionLabel(region: string, locale: string): string {
  if (locale === "uz") return toLatin(region);
  const entry = LABELS[region.trim()];
  return entry ? entry[locale as Exclude<Locale, "uz">] ?? region : region;
}
