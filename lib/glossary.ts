import data from "@/lib/glossary-data.json";
import dataEn from "@/lib/glossary-data.en.json";
import dataRu from "@/lib/glossary-data.ru.json";
import { toLatinDeep } from "@/lib/translit";

/**
 * Глоссарий терминов. Данные — lib/glossary-data.json, их собирает
 * scripts/import-glossary.mjs из Word-документа. Править нужно документ и
 * перегонять, а не JSON руками.
 */
export interface GlossarySection {
  /** «Таърифи», «Келиб чиқиши»…; null — абзац без подписи. */
  label: string | null;
  text: string;
}

export interface GlossaryTerm {
  n: number;
  term: string;
  /**
   * Вторая подпись термина: в узбекском и русском — английский эквивалент,
   * в английском — узбекский оригинал. У некоторых терминов её нет.
   */
  en: string | null;
  sections: GlossarySection[];
}

export interface Glossary {
  subtitle: string;
  terms: GlossaryTerm[];
  sources: string[];
}

/** Узбекский оригинал — из Word-документа. */
export const GLOSSARY = data as Glossary;

/**
 * Глоссарий на языке страницы. Русский и английский переводы собирает
 * scripts/build-glossary-translations.mjs из glossary/*.txt; номера
 * терминов (якоря #term-N) совпадают во всех языках.
 */
const BY_LOCALE: Record<string, Glossary> = {
  // Оригинал из Word на кириллице; на сайте узбекский — латиницей.
  uz: toLatinDeep(GLOSSARY),
  ru: dataRu as Glossary,
  en: dataEn as Glossary,
};

export function getGlossary(locale: string): Glossary {
  return BY_LOCALE[locale] ?? GLOSSARY;
}

/* ------------------------------------------------------------------ */
/*  Поиск: кириллица и латиница — одно и то же                        */
/* ------------------------------------------------------------------ */

// Узбекская кириллица (и русская) → узбекская латиница.
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", қ: "q", ғ: "g", ҳ: "h",
};
// oʻ, gʻ и все виды апострофа не различаем — пишут их кто как.
const IGNORED = new Set(["'", "ʻ", "ʼ", "‘", "’", "`", "´"]);

/**
 * Строка в общий вид для сравнения и карта: позиция в нормализованной
 * строке → позиция символа в исходной. По карте подсвечивается найденное.
 */
export function normalize(source: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  const lower = source.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (IGNORED.has(ch)) continue;
    const out = CYR[ch] ?? ch;
    for (const c of out) {
      text += c;
      map.push(i);
    }
  }
  return { text, map };
}

/** Найденные фрагменты исходной строки: [начало, конец). */
export function findMatches(source: string, query: string): [number, number][] {
  const q = normalize(query.trim()).text.replace(/\s+/g, " ");
  if (!q) return [];
  const { text, map } = normalize(source);
  const ranges: [number, number][] = [];
  for (let from = text.indexOf(q); from !== -1; from = text.indexOf(q, from + q.length)) {
    ranges.push([map[from], map[from + q.length - 1] + 1]);
  }
  return ranges;
}

export interface GlossaryHit {
  term: GlossaryTerm;
  /** 2 — совпало название термина, 1 — только текст. */
  rank: number;
}

export function searchGlossary(terms: GlossaryTerm[], query: string): GlossaryHit[] {
  if (!normalize(query.trim()).text) {
    return terms.map((term) => ({ term, rank: 0 }));
  }
  return terms
    .map((term) => {
      const inTitle =
        findMatches(term.term, query).length > 0 ||
        (term.en !== null && findMatches(term.en, query).length > 0);
      const inText = term.sections.some(
        (s) => findMatches(`${s.label ?? ""} ${s.text}`, query).length > 0,
      );
      return { term, rank: inTitle ? 2 : inText ? 1 : -1 };
    })
    .filter((hit) => hit.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.term.n - b.term.n);
}
