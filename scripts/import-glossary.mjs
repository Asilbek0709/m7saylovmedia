// Импорт глоссария из Word (.docx) в данные сайта.
//
//   node scripts/import-glossary.mjs "C:\путь\ГЛОССАРИЙ.docx"
//
// Пишет lib/glossary-data.json. Ожидаемая структура документа:
//   «N. Термин — English term»  — жирный абзац, начинается с номера;
//   «Подпись: текст»            — абзацы термина (Таърифи, Келиб чиқиши…);
//   «Фойдаланилган асосий манбалар» и дальше — список литературы.
// Абзац без подписи остаётся абзацем термина без подписи.
//
// Без зависимостей: .docx — это zip, нужный файл распаковывается zlib.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const SOURCES_HEADING = "Фойдаланилган асосий манбалар";

/** Явные опечатки исходника: латинская буква внутри кириллического слова. */
const FIXES = [
  ["медиагaча", "медиагача"], // латинская «a»
  ["Cайлов", "Сайлов"], // латинская «C» (термин 57)
];

function readZipEntry(buffer, wanted) {
  // Конец центрального каталога ищется с конца файла.
  let eocd = buffer.length - 22;
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Это не .docx: не найден каталог zip");

  const count = buffer.readUInt16LE(eocd + 10);
  let p = buffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(p + 10);
    const size = buffer.readUInt32LE(p + 20);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const local = buffer.readUInt32LE(p + 42);
    const name = buffer.toString("utf8", p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const dataStart =
        local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const data = buffer.subarray(dataStart, dataStart + size);
      return method === 0 ? data : inflateRawSync(data);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`В архиве нет ${wanted}`);
}

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

function paragraphs(xml) {
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
    .map(([p]) => {
      let text = decode([...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(""));
      for (const [from, to] of FIXES) text = text.replaceAll(from, to);
      return { bold: /<w:b\/>|<w:b w:val="(1|true)"/.test(p), text: text.replace(/\s+/g, " ").trim() };
    })
    .filter((p) => p.text);
}

const file = process.argv[2];
if (!file) {
  console.error('Укажите путь к .docx: node scripts/import-glossary.mjs "ГЛОССАРИЙ.docx"');
  process.exit(1);
}

const items = paragraphs(readZipEntry(readFileSync(file), "word/document.xml").toString("utf8"));
const terms = [];
const sources = [];
let inSources = false;
let subtitle = "";

for (const { bold, text } of items) {
  if (text === SOURCES_HEADING) {
    inSources = true;
    continue;
  }
  if (inSources) {
    sources.push(text);
    continue;
  }

  const head = bold && text.match(/^(\d+)\.\s*(.+)$/);
  if (head) {
    // «Термин — English»; у некоторых терминов английского варианта нет.
    const [uz, en] = head[2].split(/\s+—\s+/, 2);
    terms.push({ n: Number(head[1]), term: uz.trim(), en: en?.trim() ?? null, sections: [] });
    continue;
  }
  if (!terms.length) {
    if (bold && text !== "ГЛОССАРИЙ") subtitle ||= text;
    continue;
  }

  const labelled = text.match(/^([^:]{3,80}):\s+(.+)$/);
  terms.at(-1).sections.push(
    labelled && !/\(\d{4}\)/.test(labelled[1])
      ? { label: labelled[1].trim(), text: labelled[2].trim() }
      : { label: null, text },
  );
}

// Проверки: нумерация сплошная, у каждого термина есть определение.
terms.forEach((t, i) => {
  if (t.n !== i + 1) throw new Error(`Нумерация сбита на термине ${t.n}`);
  if (!t.sections.length) throw new Error(`У термина ${t.n} нет текста`);
});

const out = fileURLToPath(new URL("../lib/glossary-data.json", import.meta.url));
writeFileSync(out, JSON.stringify({ subtitle, terms, sources }, null, 2) + "\n");
console.log(`Глоссарий: ${terms.length} терминов, ${sources.length} источников → lib/glossary-data.json`);
