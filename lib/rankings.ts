import { DEMO_PERIOD, DEMO_RANKINGS, type RankingRow } from "@/lib/demo-data";
import {
  calculateSMSI,
  MS7_CRITERIA,
  WEIGHTS_VERSION,
  type CriteriaScores,
  type CriterionId,
} from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

/**
 * Согласованность экспертов по туру издания (007-experts.sql).
 * Баллы мезонов и SMSI в строках — уже средние экспертов.
 */
export interface Consensus {
  experts: number;
  /** Выборочное стандартное отклонение SMSI; null при одном эксперте. */
  smsiSd: number | null;
  smsiRange: number;
  /** Размах SMSI больше 5 баллов. */
  needsConsensus: boolean;
  criteria: Record<CriterionId, { sd: number | null; range: number }> | null;
}

export interface RankedOutlet extends RankingRow {
  rank: number;
  smsi: number;
  prevSmsi: number | null;
  /** null — демо-режим или база до 007-experts.sql. */
  consensus: Consensus | null;
}

export interface RankingsResult {
  rows: RankedOutlet[];
  period: string;

  live: boolean;
}

export interface HistoryPoint extends CriteriaScores {
  period: string;
  evaluatedAt: string;
  smsi: number;
  /** Версия весов, которой посчитан индекс; null — до 006-weight-sets.sql. */
  weightSetId: number | null;
  consensus: Consensus | null;
}

export interface OutletHistory {
  /** uuid издания в базе; в демо-режиме — slug. */
  id: string;
  name: string;
  slug: string;
  website: string | null;
  ownership: "davlat" | "nodavlat";
  region: string;
  points: HistoryPoint[];
  live: boolean;
}

const BASE_COLUMNS =
  "outlet_id, name, slug, website, ownership, region, period, evaluated_at, legal, quality, speed, multimedia, interactivity, engagement, convergence, smsi, prev_smsi";

/**
 * Наборы колонок от новых к старым: база может отставать от кода на
 * несколько миграций, и страницы не должны из-за этого падать в демо.
 */
const COLUMN_SETS = [
  `${BASE_COLUMNS}, weight_set_id, experts, smsi_sd, smsi_range, needs_consensus, criteria_spread`,
  `${BASE_COLUMNS}, weight_set_id`,
  BASE_COLUMNS,
];

type DynamicsRow = RankingRow & {
  period: string;
  evaluated_at: string;
  smsi: number;
  prev_smsi: number | null;
  weight_set_id?: number | null;
  experts?: number;
  smsi_sd?: number | null;
  smsi_range?: number | null;
  needs_consensus?: boolean;
  criteria_spread?: Record<string, { sd: number | null; range: number }> | null;
};

interface QueryResult {
  data: unknown[] | null;
  error: { code?: string } | null;
}

async function selectLatestColumns(
  run: (columns: string) => PromiseLike<QueryResult>,
): Promise<QueryResult> {
  let result: QueryResult = { data: null, error: null };
  for (const columns of COLUMN_SETS) {
    result = await run(columns);
    // 42703 — колонки нет: миграция ещё не выполнена, пробуем старый набор.
    if (result.error?.code !== "42703") return result;
  }
  return result;
}

const scoresOf = (row: RankingRow): CriteriaScores =>
  Object.fromEntries(
    MS7_CRITERIA.map((c) => [c.id, Number(row[c.id])]),
  ) as CriteriaScores;

const numberOrNull = (v: unknown) =>
  v === null || v === undefined ? null : Number(v);

function consensusOf(row: DynamicsRow): Consensus | null {
  if (row.experts === undefined) return null;
  const spread = row.criteria_spread;

  return {
    experts: Number(row.experts),
    smsiSd: numberOrNull(row.smsi_sd),
    smsiRange: Number(row.smsi_range ?? 0),
    needsConsensus: Boolean(row.needs_consensus),
    criteria: spread
      ? (Object.fromEntries(
          MS7_CRITERIA.map((c) => [
            c.id,
            {
              sd: numberOrNull(spread[c.id]?.sd),
              range: Number(spread[c.id]?.range ?? 0),
            },
          ]),
        ) as Consensus["criteria"])
      : null,
  };
}

const rank = (rows: RankingRow[]): RankedOutlet[] =>
  rows
    .map((row) => ({
      ...row,
      smsi: calculateSMSI(scoresOf(row)),
      prevSmsi: null,
      consensus: null,
    }))
    .sort((a, b) => b.smsi - a.smsi || a.name.localeCompare(b.name))
    .map((row, i) => ({ ...row, rank: i + 1 }));

/** `limit = null` — весь тур: срезы рейтинга считаются по всем изданиям. */
export async function getRankings(
  limit: number | null = 10,
): Promise<RankingsResult> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data, error } = await selectLatestColumns((columns) => {
        const query = supabase
          .from("media_latest_rankings")
          .select(columns)
          .order("rank");
        return limit === null ? query : query.limit(limit);
      });

      if (!error && data?.length) {
        const fetched = data as DynamicsRow[];

        return {
          rows: fetched.map((row, i) => ({
            ...row,
            ...scoresOf(row),
            rank: i + 1,
            smsi: Number(row.smsi),
            prevSmsi: numberOrNull(row.prev_smsi),
            consensus: consensusOf(row),
          })),
          period: fetched[0].period ?? DEMO_PERIOD,
          live: true,
        };
      }
    } catch {}
  }

  return {
    rows: rank(DEMO_RANKINGS).slice(0, limit ?? undefined),
    period: DEMO_PERIOD,
    live: false,
  };
}

export async function getOutletHistory(
  slug: string,
): Promise<OutletHistory | null> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data, error } = await selectLatestColumns((columns) =>
        supabase
          .from("media_dynamics")
          .select(columns)
          .eq("slug", slug)
          .order("evaluated_at", { ascending: true }),
      );

      if (!error && data?.length) {
        const rows = data as DynamicsRow[];
        const head = rows[0];

        return {
          id: head.outlet_id,
          name: head.name,
          slug: head.slug,
          website: head.website ?? null,
          ownership: head.ownership,
          region: head.region,
          live: true,
          points: rows.map((row) => ({
            ...scoresOf(row),
            period: row.period,
            evaluatedAt: row.evaluated_at,
            smsi: Number(row.smsi),
            weightSetId: row.weight_set_id ?? null,
            consensus: consensusOf(row),
          })),
        };
      }
    } catch {}
  }

  const demo = DEMO_RANKINGS.find((row) => row.slug === slug);
  if (!demo) return null;

  return {
    id: demo.outlet_id,
    name: demo.name,
    slug: demo.slug,
    website: demo.website,
    ownership: demo.ownership,
    region: demo.region,
    live: false,
    points: [
      {
        ...scoresOf(demo),
        period: DEMO_PERIOD,
        evaluatedAt: "",
        smsi: calculateSMSI(scoresOf(demo)),
        weightSetId: WEIGHTS_VERSION,
        consensus: null,
      },
    ],
  };
}
