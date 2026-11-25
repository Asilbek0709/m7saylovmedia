import { getTranslations } from "next-intl/server";

import { isLocale, DEFAULT_LOCALE } from "@/i18n/config";
import { resolveBand } from "@/lib/ms7";
import { BAND_HEX } from "@/lib/og";
import { getRankings } from "@/lib/rankings";

/**
 * Значок «MS-7 · SMSI» для сайта издания: /badge/<slug>.svg[?lang=uz|ru|en].
 * Живая картинка — показывает текущий индекс, уровень и место в рейтинге,
 * обновляется раз в час. Издание вставляет её к себе со ссылкой на свою
 * страницу на платформе (код — на странице издания).
 */

// Логотип (квадрат-облачко с M7) — тот же рисунок, что app/icon.svg.
const MARK = `
  <path d="M16 2h32a14 14 0 0 1 14 14v26a14 14 0 0 1-14 14H26l-16 8V54a14 14 0 0 1-8-12V16A14 14 0 0 1 16 2z" fill="#ffffff"/>
  <path d="M15 42V16l12 16 12-16h12L40 42" fill="none" stroke="#0f2a47" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="51" cy="16" r="4.5" fill="#ef9f27"/>`;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Ширина текста без измерения: средняя ширина символа системного шрифта.
const textWidth = (s: string, size: number) => Math.ceil(s.length * size * 0.58);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const slug = (await params).slug.replace(/\.svg$/i, "");
  const langParam = new URL(request.url).searchParams.get("lang");
  const locale = isLocale(langParam) ? langParam : DEFAULT_LOCALE;
  const tb = await getTranslations({ locale, namespace: "bands" });
  const t = await getTranslations({ locale, namespace: "badge" });

  const { rows } = await getRankings(null);
  const row = rows.find((r) => r.slug === slug);

  const title = "MS-7 · SMSI";
  let score: string;
  let line2: string;
  let color: string;
  if (row) {
    const band = resolveBand(row.smsi);
    score = row.smsi.toFixed(1);
    line2 = `${tb(`${band.id}.label`)} · #${row.rank}/${rows.length}`;
    color = BAND_HEX[band.id] ?? "#0f2a47";
  } else {
    score = "—";
    line2 = t("notRated");
    color = "#6b7684";
  }

  const left = 112;
  const right = Math.max(textWidth(score, 20) + 16, textWidth(line2, 11)) + 28;
  const width = left + right;
  const height = 48;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(`${title}: ${score} — ${line2}`)}">
  <title>${escape(`${title}: ${score} — ${line2}`)}</title>
  <clipPath id="r"><rect width="${width}" height="${height}" rx="9"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    <rect width="${left}" height="${height}" fill="#0f2a47"/>
    <rect x="${left}" width="4" height="${height}" fill="${color}"/>
  </g>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8.5" fill="none" stroke="#e4e7ec"/>
  <g transform="translate(10 10) scale(0.44)">${MARK}</g>
  <g font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
    <text x="45" y="21" font-size="13" font-weight="700" fill="#ffffff">MS-7</text>
    <text x="45" y="36" font-size="10" fill="#c7d3e3">SMSI ${new Date().getFullYear()}</text>
    <text x="${left + 16}" y="25" font-size="20" font-weight="700" fill="${color}">${escape(score)}</text>
    <text x="${left + 16}" y="40" font-size="11" fill="#3f4c5a">${escape(line2)}</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Значок висит на чужих сайтах: кешируем на час, чтобы не грузить базу.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
