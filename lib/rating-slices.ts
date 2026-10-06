import { MS7_CRITERIA, type CriteriaScores } from "@/lib/ms7";
import type { RankedOutlet } from "@/lib/rankings";

export type Ownership = "davlat" | "nodavlat";
export type OwnershipFilter = "all" | Ownership;

/** Ниже этого числа изданий среднее по группе выводится с предупреждением. */
export const SMALL_SAMPLE = 3;

export interface SliceFilter {
  ownership: OwnershipFilter;
  /** `null` — все регионы. */
  region: string | null;
}

export interface GroupStats {
  count: number;
  /** `null` у пустой группы — чтобы до интерфейса не доехал `NaN`. */
  smsi: number | null;
  criteria: Record<keyof CriteriaScores, number> | null;
}

export interface RegionStats {
  region: string;
  count: number;
  smsi: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const regionOf = (row: RankedOutlet) => row.region?.trim() ?? "";

/** Список регионов для фильтра — в алфавитном порядке, без пустых. */
export function listRegions(rows: RankedOutlet[]): string[] {
  return [...new Set(rows.map(regionOf).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * Разбирает параметры адреса. Неизвестные значения не ломают страницу,
 * а сбрасываются на «все» — ссылка со старым регионом просто откроет рейтинг.
 */
export function parseSliceFilter(
  params: Record<string, string | string[] | undefined>,
  regions: string[],
): SliceFilter {
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const ownership = one(params.ownership);
  const region = one(params.region)?.trim();

  return {
    ownership:
      ownership === "davlat" || ownership === "nodavlat" ? ownership : "all",
    region: region && regions.includes(region) ? region : null,
  };
}

export function applySliceFilter(
  rows: RankedOutlet[],
  { ownership, region }: Partial<SliceFilter>,
): RankedOutlet[] {
  return rows.filter(
    (row) =>
      (!ownership || ownership === "all" || row.ownership === ownership) &&
      (!region || regionOf(row) === region),
  );
}

/** Пересчитывает места внутри среза: 1, 2, 3… без пропусков. */
export function rerank(rows: RankedOutlet[]): RankedOutlet[] {
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Средние группы. SMSI линеен по мезонам, поэтому среднее индексов равно
 * индексу от средних — здесь берётся среднее индексов, как в таблице,
 * чтобы результат сходился с ручным пересчётом по её столбцу SMSI.
 */
export function groupStats(rows: RankedOutlet[]): GroupStats {
  if (!rows.length) return { count: 0, smsi: null, criteria: null };

  const mean = (pick: (row: RankedOutlet) => number) =>
    round1(rows.reduce((s, row) => s + Number(pick(row)), 0) / rows.length);

  return {
    count: rows.length,
    smsi: mean((row) => row.smsi),
    criteria: Object.fromEntries(
      MS7_CRITERIA.map((c) => [c.id, mean((row) => row[c.id])]),
    ) as Record<keyof CriteriaScores, number>,
  };
}

/** Регионы по убыванию среднего SMSI; издания без региона — отдельной строкой. */
export function regionStats(rows: RankedOutlet[]): RegionStats[] {
  const byRegion = new Map<string, RankedOutlet[]>();
  for (const row of rows) {
    const key = regionOf(row);
    byRegion.set(key, [...(byRegion.get(key) ?? []), row]);
  }

  return [...byRegion]
    .map(([region, group]) => ({
      region,
      count: group.length,
      smsi: groupStats(group).smsi ?? 0,
    }))
    .sort(
      (a, b) =>
        b.smsi - a.smsi || b.count - a.count || a.region.localeCompare(b.region),
    );
}

/** Адрес страницы рейтинга с фильтром; параметры по умолчанию не пишутся. */
export function sliceHref({ ownership, region }: SliceFilter): string {
  const params = new URLSearchParams();
  if (ownership !== "all") params.set("ownership", ownership);
  if (region) params.set("region", region);
  const query = params.toString();
  return query ? `/rating?${query}` : "/rating";
}
