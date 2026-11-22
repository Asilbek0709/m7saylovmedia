/**
 * Узбекская кириллица → узбекская латиница (алфавит 1995 года).
 *
 * Правила, которые не сводятся к замене буква в букву:
 *  • е → ye в начале слова и после гласной, ъ, ь; иначе → e;
 *  • ц → ts после гласной (konstitutsiya), иначе → s (funksiya, sirk);
 *  • ў, ғ → oʻ, gʻ — с буквой ʻ (U+02BB), а не апострофом;
 *  • ъ → ʼ (U+02BC, tutuq belgisi), ь — опускается;
 *  • регистр: «Ш» в начале слова → «Sh», в слове капслоком → «SH».
 *
 * Латиница, цифры и знаки проходят без изменений, поэтому функцию можно
 * применять к строкам со смешанным текстом и к шаблонам ICU ({count}).
 */

const VOWELS = new Set("аеёиоуўэюяы");
const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x", ч: "ch", ш: "sh", щ: "sh",
  ъ: "ʼ", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "oʻ", қ: "q", ғ: "gʻ", ҳ: "h",
};

const isCyr = (ch: string | undefined) => !!ch && /[а-яёўқғҳ]/i.test(ch);
const isUpper = (ch: string | undefined) =>
  !!ch && ch !== ch.toLowerCase() && ch === ch.toUpperCase();

export function toLatin(text: string): string {
  let out = "";
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const lower = ch.toLowerCase();
    if (!isCyr(ch)) {
      out += ch;
      continue;
    }

    const prev = chars[i - 1]?.toLowerCase();
    const wordStart = !isCyr(chars[i - 1]);

    let latin: string;
    if (lower === "е") {
      latin = wordStart || VOWELS.has(prev!) || prev === "ъ" || prev === "ь" ? "ye" : "e";
    } else if (lower === "ц") {
      latin = !wordStart && VOWELS.has(prev!) ? "ts" : "s";
    } else {
      latin = MAP[lower] ?? ch;
    }

    if (isUpper(ch) && latin) {
      // Слово капслоком (ОАВ, МСК) — вся замена заглавными; иначе — только первая буква.
      const neighbourUpper = isUpper(chars[i + 1]) || (!wordStart && isUpper(chars[i - 1]));
      latin = neighbourUpper
        ? latin.toUpperCase()
        : latin.charAt(0).toUpperCase() + latin.slice(1);
    }
    out += latin;
  }
  return out;
}

/** Рекурсивно — для JSON-данных (строки внутри объектов и массивов). */
export function toLatinDeep<T>(value: T): T {
  if (typeof value === "string") return toLatin(value) as T;
  if (Array.isArray(value)) return value.map(toLatinDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, toLatinDeep(v)]),
    ) as T;
  }
  return value;
}
