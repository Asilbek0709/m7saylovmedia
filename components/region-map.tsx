"use client";

import * as React from "react";
import Link from "next/link";

import { resolveBand, SMSI_BANDS } from "@/lib/ms7";
import { UZ_MAP_VIEWBOX, UZ_REGIONS } from "@/lib/uz-map";

// Регион без оценок: заметно темнее фона карточки, но без цвета уровня.
const NO_DATA = "color-mix(in srgb, var(--muted-foreground) 16%, var(--card))";
const CITY = "Тошкент";

export interface RegionMapDatum {
  smsi: number;
  count: number;
  href: string;
}

export interface RegionMapLabels {
  /** Подпись региона на языке страницы — по ключу из базы. */
  names: Record<string, string>;
  bands: Record<string, string>;
  outlets: string;
  noData: string;
  attribution: string;
  showAll: string;
}

/**
 * Карта Узбекистана: регион закрашен цветом уровня по среднему SMSI его
 * изданий; нажатие — фильтр рейтинга по региону. Регион без оценок серый
 * и не кликается (фильтр по нему ничего бы не показал).
 */
export function RegionMap({
  data,
  active,
  allHref,
  labels,
}: {
  data: Record<string, RegionMapDatum>;
  active: string | null;
  allHref: string;
  labels: RegionMapLabels;
}) {
  const [hover, setHover] = React.useState<string | null>(null);
  const shown = hover ?? active;
  const info = shown ? data[shown] : undefined;
  // Ташкент (город) — внутри области: рисуем его последним, поверх.
  const shapes = [...UZ_REGIONS].sort((a, b) =>
    a.key === CITY ? 1 : b.key === CITY ? -1 : 0,
  );

  return (
    <div className="relative">
      <svg
        viewBox={UZ_MAP_VIEWBOX}
        className="h-auto w-full"
        role="img"
        aria-label={Object.keys(data)
          .map((k) => `${labels.names[k] ?? k}: ${data[k].smsi.toFixed(1)}`)
          .join("; ")}
      >
        {shapes.map((r) => {
          const d = data[r.key];
          const band = d ? resolveBand(d.smsi) : null;
          const isActive = active === r.key;
          const isHover = hover === r.key;
          const path = (
            <path
              d={r.d}
              fill={band ? band.color : NO_DATA}
              fillOpacity={band ? (isHover || isActive ? 0.95 : 0.72) : 1}
              stroke={isActive ? "var(--gold)" : "var(--card)"}
              strokeWidth={isActive ? 4 : isHover ? 2.5 : 1.5}
              strokeLinejoin="round"
              className="transition-[fill-opacity,stroke-width] duration-200"
            />
          );
          return d ? (
            <Link
              key={r.key}
              href={isActive ? allHref : d.href}
              scroll={false}
              aria-label={labels.names[r.key] ?? r.key}
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(r.key)}
              onBlur={() => setHover(null)}
              className="cursor-pointer outline-none"
            >
              {path}
            </Link>
          ) : (
            <g
              key={r.key}
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
            >
              {path}
            </g>
          );
        })}
        {/* Ташкент-город на карте крошечный, а изданий в нём больше всего —
            показываем его маркером с индексом. */}
        {(() => {
          const city = UZ_REGIONS.find((r) => r.key === CITY);
          const d = data[CITY];
          if (!city || !d) return null;
          const band = resolveBand(d.smsi);
          return (
            <Link
              href={active === CITY ? allHref : d.href}
              scroll={false}
              aria-label={labels.names[CITY] ?? CITY}
              onMouseEnter={() => setHover(CITY)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(CITY)}
              onBlur={() => setHover(null)}
              className="cursor-pointer outline-none"
            >
              <circle
                cx={city.x}
                cy={city.y}
                r={hover === CITY || active === CITY ? 30 : 26}
                fill={band.color}
                stroke={active === CITY ? "var(--gold)" : "#fff"}
                strokeWidth={active === CITY ? 5 : 3}
                className="transition-[r] duration-200"
              />
              <text
                x={city.x}
                y={city.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none font-display"
                fontSize={20}
                fontWeight={700}
                fill="#fff"
              >
                {d.smsi.toFixed(0)}
              </text>
            </Link>
          );
        })()}

        {/* Средний индекс — на регионах, где он есть */}
        {shapes
          .filter((r) => data[r.key] && r.key !== CITY)
          .map((r) => (
            <text
              key={r.key}
              x={r.x}
              y={r.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none font-display"
              fontSize={22}
              fontWeight={700}
              fill="#fff"
              stroke="rgb(15 42 71 / 0.35)"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {data[r.key].smsi.toFixed(0)}
            </text>
          ))}
      </svg>

      {/* Подсказка о регионе */}
      <div className="pointer-events-none absolute top-2 left-2 min-w-40 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        {shown ? (
          <>
            <p className="font-display text-sm font-semibold text-foreground">
              {labels.names[shown] ?? shown}
            </p>
            {info ? (
              <p className="mt-0.5 text-muted-foreground tabular">
                <span className="font-semibold" style={{ color: resolveBand(info.smsi).color }}>
                  {info.smsi.toFixed(1)}
                </span>{" "}
                · {labels.bands[resolveBand(info.smsi).id]} · {info.count} {labels.outlets}
              </p>
            ) : (
              <p className="mt-0.5 text-muted-foreground">{labels.noData}</p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">{labels.showAll}</p>
        )}
      </div>

      {/* Легенда */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {[...SMSI_BANDS].reverse().map((b) => (
          <span key={b.id} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
            {labels.bands[b.id]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-muted ring-1 ring-border" />
          {labels.noData}
        </span>
        <span className="ml-auto">{labels.attribution}</span>
      </div>
    </div>
  );
}
