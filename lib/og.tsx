import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { MS7_CRITERIA, type CriteriaScores } from "@/lib/ms7";

/**
 * Общее для картинок-превью (OpenGraph): их показывают Telegram, Facebook,
 * WhatsApp при отправке ссылки. Рисуются на сервере (next/og), поэтому
 * цвета — готовые значения, а шрифт Onest лежит в assets/fonts как TTF
 * (в нём есть ʻ/ʼ узбекской латиницы и Ў Қ Ғ Ҳ кириллицы).
 */

export const OG_SIZE = { width: 1200, height: 630 };

/** Цвета уровней светлой темы — в картинках нет CSS-переменных сайта. */
export const BAND_HEX: Record<string, string> = {
  veryhigh: "#2d865d",
  high: "#4d7a41",
  moderate: "#86641e",
  poor: "#854326",
  critical: "#752b28",
};

export const NAVY = "#0f2a47";
export const GOLD = "#ef9f27";

export async function ogFonts() {
  const dir = join(process.cwd(), "assets/fonts");
  const [regular, bold] = await Promise.all([
    readFile(join(dir, "Onest-400.ttf")),
    readFile(join(dir, "Onest-700.ttf")),
  ]);
  return [
    { name: "Onest", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Onest", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/** Знак MS-7 — квадрат-облачко с монограммой, как app/icon.svg. */
export function OgMark({ size, inverted = false }: { size: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path
        d="M16 2h32a14 14 0 0 1 14 14v26a14 14 0 0 1-14 14H26l-16 8V54a14 14 0 0 1-8-12V16A14 14 0 0 1 16 2z"
        fill={inverted ? "#ffffff" : NAVY}
      />
      <path
        d="M15 42V16l12 16 12-16h12L40 42"
        fill="none"
        stroke={inverted ? NAVY : "#ffffff"}
        strokeWidth={7}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={51} cy={16} r={4.5} fill={GOLD} />
    </svg>
  );
}

/** Радар семи мезонов: сетка и профиль издания. */
export function OgRadar({
  scores,
  color,
  size,
  codes,
}: {
  scores: CriteriaScores;
  color: string;
  size: number;
  codes: string[];
}) {
  const c = size / 2;
  const r = size / 2 - 34;
  const at = (i: number, v: number) => {
    const a = ((-90 + (i * 360) / MS7_CRITERIA.length) * Math.PI) / 180;
    return [c + ((r * v) / 100) * Math.cos(a), c + ((r * v) / 100) * Math.sin(a)];
  };
  const ring = (v: number) =>
    MS7_CRITERIA.map((_, i) => at(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
  const profile = MS7_CRITERIA.map((cr, i) =>
    at(i, scores[cr.id]).map((n) => n.toFixed(1)).join(","),
  ).join(" ");

  // Подписи — обычными блоками поверх SVG: текст внутри SVG рендерер
  // картинок рисует без наших шрифтов.
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[25, 50, 75, 100].map((v) => (
          <polygon key={v} points={ring(v)} fill="none" stroke="#e4e7ec" strokeWidth={2} />
        ))}
        <polygon
          points={profile}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        {MS7_CRITERIA.map((cr, i) => {
          const [x, y] = at(i, scores[cr.id]);
          return <circle key={cr.id} cx={x} cy={y} r={7} fill="#ffffff" stroke={color} strokeWidth={4} />;
        })}
      </svg>
      {MS7_CRITERIA.map((cr, i) => {
        const [x, y] = at(i, 122);
        return (
          <div
            key={cr.id}
            style={{
              position: "absolute",
              left: x - 30,
              top: y - 15,
              width: 60,
              display: "flex",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              color: "#6b7684",
            }}
          >
            {codes[i]}
          </div>
        );
      })}
    </div>
  );
}
