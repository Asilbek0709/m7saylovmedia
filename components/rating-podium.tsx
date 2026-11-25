import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";

import { OutletLogo } from "@/components/outlet-logo";
import { SmsiBadge } from "@/components/smsi-badge";
import { resolveBand } from "@/lib/ms7";
import type { RankedOutlet } from "@/lib/rankings";
import { cn } from "@/lib/utils";

const MEDALS = [
  { color: "var(--gold)", height: "md:pt-10" },
  { color: "#a8b3c1", height: "md:pt-6" },
  { color: "#c08457", height: "md:pt-3" },
] as const;

export interface PodiumLabels {
  bands: Record<string, string>;
  region: (region: string) => string;
  points: string;
  change: string;
}

/**
 * Пьедестал тройки лидеров. На широком экране — 2-1-3 (первое место выше),
 * на телефоне — столбиком по порядку.
 */
export function RatingPodium({
  rows,
  labels,
}: {
  rows: RankedOutlet[];
  labels: PodiumLabels;
}) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  // Порядок колонок на широком экране: 2-е, 1-е, 3-е.
  const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);

  return (
    <ol className="mt-6 grid items-end gap-4 md:grid-cols-3">
      {order.map((index) => {
        const row = top[index];
        const band = resolveBand(row.smsi);
        const medal = MEDALS[index];
        const delta = row.prevSmsi === null ? null : row.smsi - row.prevSmsi;
        return (
          <li
            key={row.outlet_id}
            className={cn(
              "ms7-rise",
              // На телефоне — по порядку мест, на широком — 2-1-3.
              index === 0 ? "order-first md:order-none" : "",
            )}
            style={{ ["--d" as string]: `${index * 90}ms` }}
          >
            <Link
              href={`/outlets/${row.slug}`}
              className={cn(
                "ms7-surface group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-18px_rgb(15_42_71_/_0.35)]",
                index === 0 && "border-gold/60",
              )}
            >
              {/* Цветная полоса уровня сверху */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: band.color }}
              />
              <div className={cn("flex items-start justify-between gap-3", medal.height)}>
                <div className="flex min-w-0 items-center gap-3">
                  <OutletLogo
                    name={row.name}
                    website={row.website}
                    className={index === 0 ? "size-12" : "size-10"}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                      {row.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[row.website, row.region && labels.region(row.region)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <span
                  aria-label={`#${row.rank}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: medal.color }}
                >
                  {row.rank}
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p
                    className={cn(
                      "font-display leading-none font-bold tracking-tight tabular",
                      index === 0 ? "text-5xl" : "text-4xl",
                    )}
                    style={{ color: band.color }}
                  >
                    {row.smsi.toFixed(1)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    SMSI · {labels.points}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <SmsiBadge band={band} label={labels.bands[band.id]} size="sm" />
                  {delta !== null && Math.abs(delta) >= 0.05 && (
                    <span
                      title={labels.change}
                      className="inline-flex items-center gap-1 text-xs font-medium tabular"
                      style={{ color: delta > 0 ? "var(--smsi-high)" : "var(--smsi-poor)" }}
                    >
                      {delta > 0 ? (
                        <TrendingUp aria-hidden className="size-3.5" />
                      ) : (
                        <TrendingDown aria-hidden className="size-3.5" />
                      )}
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
