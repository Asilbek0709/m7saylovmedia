// Иконки сайта из app/icon.svg:
//   app/favicon.ico      — 16, 32, 48 px (PNG внутри ICO) для старых браузеров;
//   app/apple-icon.png   — 180 px на белом фоне для экрана «Домой» в iOS;
//   public/icons/icon-192.png, icon-512.png — для установки как приложение
//   (манифест app/manifest.ts), icon-maskable-512.png — с полями под маску Android.
//
//   node scripts/build-icons.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

// Иконки PWA: обычные — на белом с небольшим полем, maskable — с полем 20 %
// (Android обрезает их кругом или «каплей»).
mkdirSync(path("public/icons"), { recursive: true });
for (const [file, size, pad] of [
  ["icon-192.png", 192, 0.1],
  ["icon-512.png", 512, 0.1],
  ["icon-maskable-512.png", 512, 0.2],
]) {
  const inner = Math.round(size * (1 - pad * 2));
  const art = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
  const offset = Math.round((size - inner) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: art, top: offset, left: offset }])
    .png()
    .toFile(path(`public/icons/${file}`));
}

console.log("favicon.ico, apple-icon.png и иконки PWA готовы");
