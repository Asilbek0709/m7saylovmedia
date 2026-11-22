// Переводы глоссария: lib/glossary-data.json (узбекский, из Word) +
// glossary/<locale>-*.txt → lib/glossary-data.<locale>.json.
//
//   node scripts/build-glossary-translations.mjs
//
// Формат перевода: «#N | Термин», затем по строке «- текст» на каждый раздел
// в том же порядке, что в узбекском оригинале. Подписи разделов переводятся
// по таблице LABELS ниже. Скрипт проверяет, что число терминов и разделов
// совпадает с оригиналом — расхождение остановит сборку.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const source = JSON.parse(readFileSync(root("lib/glossary-data.json"), "utf8"));

const LABELS = {
  "Таърифи": ["Определение", "Definition"],
  "Келиб чиқиши ва илмий ривожланиши": ["Происхождение и научное развитие", "Origin and scholarly development"],
  "Сайлов журналистикасидаги аҳамияти": ["Значение для избирательной журналистики", "Relevance to election journalism"],
  "Илмий ривожланишидаги муҳим сана ва муаллифлар": ["Ключевые даты и авторы", "Key dates and authors"],
  "Илмий ривожланишидаги муҳим манба": ["Ключевой источник", "Key source"],
  "Илмий тадқиқотдаги муҳим сана ва муаллифлар": ["Ключевые даты и авторы исследований", "Key research dates and authors"],
  "Илмий манбалари": ["Научные источники", "Scholarly sources"],
  "Илмий ривожланиши": ["Научное развитие", "Scholarly development"],
  "Келиб чиқиши": ["Происхождение", "Origin"],
  "Илмий ривожланишидаги муҳим сана": ["Ключевая дата", "Key date"],
  "Илмий ривожланишидаги муҳим давр": ["Ключевой период", "Key period"],
  "Муҳим илмий манба": ["Важный научный источник", "Key scholarly source"],
  "Муҳим илмий манбалар": ["Важные научные источники", "Key scholarly sources"],
  "Илмий ривожланишидаги манбалар": ["Источники в развитии понятия", "Sources in its development"],
  "Илмий ривожланишидаги муҳим манбалар": ["Ключевые источники", "Key sources"],
  "Муҳим аниқлик": ["Важное уточнение", "Important clarification"],
  "Илмий-методологик асос": ["Научно-методологическая основа", "Scientific and methodological basis"],
};

const SUBTITLE = {
  ru: "Научные термины, связанные с избирательными процессами и средствами массовой информации",
  en: "Scholarly terms related to electoral processes and the mass media",
};

function parse(text) {
  const terms = new Map();
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^#(\d+)\s*\|\s*(.+)$/);
    if (head) {
      current = { n: Number(head[1]), term: head[2].trim(), texts: [] };
      terms.set(current.n, current);
    } else if (line.startsWith("- ") && current) {
      current.texts.push(line.slice(2).trim());
    } else {
      throw new Error(`Непонятная строка: ${line.slice(0, 60)}`);
    }
  }
  return terms;
}

for (const [locale, idx] of [["ru", 0], ["en", 1]]) {
  const dir = root("glossary");
  const files = readdirSync(dir).filter((f) => f.startsWith(`${locale}-`) && f.endsWith(".txt")).sort();
  const translated = new Map();
  for (const f of files) for (const [n, t] of parse(readFileSync(`${dir}/${f}`, "utf8"))) translated.set(n, t);

  const terms = source.terms.map((orig) => {
    const tr = translated.get(orig.n);
    if (!tr) throw new Error(`${locale}: нет перевода термина #${orig.n}`);
    if (tr.texts.length !== orig.sections.length) {
      throw new Error(`${locale} #${orig.n}: разделов ${tr.texts.length}, в оригинале ${orig.sections.length}`);
    }
    return {
      n: orig.n,
      term: tr.term,
      // Вторая подпись термина: на русском — английский эквивалент,
      // на английском — узбекский оригинал.
      en: (() => {
        const alt = locale === "en" ? orig.term : orig.en;
        return alt && alt !== tr.term ? alt : null;
      })(),
      sections: orig.sections.map((s, i) => ({
        label: s.label === null ? null : (LABELS[s.label]?.[idx] ?? (() => { throw new Error(`Нет перевода подписи «${s.label}»`); })()),
        text: tr.texts[i],
      })),
    };
  });

  const out = { subtitle: SUBTITLE[locale], terms, sources: source.sources };
  writeFileSync(root(`lib/glossary-data.${locale}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`${locale}: ${terms.length} терминов → lib/glossary-data.${locale}.json`);
}
