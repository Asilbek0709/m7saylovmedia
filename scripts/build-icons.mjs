// Иконки сайта из app/icon.svg:
//   app/favicon.ico      — 16, 32, 48 px (PNG внутри ICO) для старых браузеров;
//   app/apple-icon.png   — 180 px на белом фоне для экрана «Домой» в iOS.
//
//   node scripts/build-icons.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const svg = readFileSync(path("app/icon.svg"));

const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((s) => sharp(svg, { density: 384 }).resize(s, s).png().toBuffer()),
);

// ICO: заголовок 6 байт, по 16 байт на картинку, затем сами PNG.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s === 256 ? 0 : s, 0);
  e.writeUInt8(s === 256 ? 0 : s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync(path("app/favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));

const mark = await sharp(svg, { density: 384 }).resize(136, 136).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: "#ffffff" } })
  .composite([{ input: mark, top: 22, left: 22 }])
  .png()
  .toFile(path("app/apple-icon.png"));

console.log("favicon.ico (16/32/48) и apple-icon.png (180) готовы");
