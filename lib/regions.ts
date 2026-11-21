import type { Locale } from "@/i18n/config";

/**
 * Регионы хранятся в базе по-узбекски (кириллица) — это и ключ фильтра.
 * Здесь только подпись для показа на русском и английском; неизвестный
 * регион показывается как есть.
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

export function regionLabel(region: string, locale: string): string {
  if (locale === "uz") return region;
  const entry = LABELS[region.trim()];
  return entry ? entry[locale as Exclude<Locale, "uz">] ?? region : region;
}
