// Одноразовый перевод messages/uz.json с кириллицы на латиницу.
//   node --experimental-strip-types scripts/uz-to-latin.mts
// Повторный запуск безопасен: латиница проходит без изменений.

import { readFileSync, writeFileSync } from "node:fs";
import { toLatinDeep } from "../lib/translit.ts";

const file = new URL("../messages/uz.json", import.meta.url);
const raw = readFileSync(file, "utf8");
const latin = toLatinDeep(JSON.parse(raw));

// Подсказка поиска глоссария должна показывать пример именно на кириллице.
latin.glossary.searchHint =
  "Lotin yoki kirill yozuvida qidirish mumkin: «siyosiy» va «сиёсий» bir xil natija beradi. Inglizcha nomlar ham qidiriladi.";

writeFileSync(file, JSON.stringify(latin, null, 2) + (raw.endsWith("\n") ? "\n" : ""));
console.log("messages/uz.json → lotin");
