import { DEMO_PERIOD, DEMO_RANKINGS, type RankingRow } from "@/lib/demo-data";
import { calculateSMSI, MS7_CRITERIA, type CriteriaScores } from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

export interface RankedOutlet extends RankingRow {
  rank: number;
  smsi: number;
  prevSmsi: number | null;
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
}

export interface OutletHistory {
  name: string;
  slug: string;
  website: string | null;
  ownership: "davlat" | "nodavlat";
  region: string;
  points: HistoryPoint[];
  live: boolean;
}

const SELECT =
  "outlet_id, name, slug, website, ownership, region, period, evaluated_at, legal, quality, speed, multimedia, interactivity, engagement, convergence, smsi, prev_smsi";

type DynamicsRow = RankingRow & {
  period: string;
  evaluated_at: string;
  smsi: number;
  prev_smsi: number | null;
};

const scoresOf = (row: RankingRow): CriteriaScores =>
  Object.fromEntries(
    MS7_CRITERIA.map((c) => [c.id, row[c.id]]),
  ) as CriteriaScores;

const rank = (rows: RankingRow[]): RankedOutlet[] =>
  rows
    .map((row) => ({
      ...row,
      smsi: calculateSMSI(scoresOf(row)),
      prevSmsi: null,
    }))
    .sort((a, b) => b.smsi - a.smsi || a.name.localeCompare(b.name))
    .map((row, i) => ({ ...row, rank: i + 1 }));

export async function getRankings(limit = 10): Promise<RankingsResult> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("media_latest_rankings")
        .select(SELECT)
        .order("rank")
        .limit(limit);

      if (!error && data?.length) {
        const fetched = data as unknown as DynamicsRow[];

        return {
          rows: fetched.map((row, i) => ({
            ...row,
            rank: i + 1,
            prevSmsi: row.prev_smsi,
          })),
          period: fetched[0].period ?? DEMO_PERIOD,
          live: true,
        };
      }
    } catch {}
  }

  return {
    rows: rank(DEMO_RANKINGS).slice(0, limit),
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
      const { data, error } = await supabase
        .from("media_dynamics")
        .select(SELECT)
        .eq("slug", slug)
        .order("evaluated_at", { ascending: true });

      if (!error && data?.length) {
        const rows = data as unknown as DynamicsRow[];
        const head = rows[0];

        return {
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
          })),
        };
      }
    } catch {}
  }

  const demo = DEMO_RANKINGS.find((row) => row.slug === slug);
  if (!demo) return null;

  return {
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
      },
    ],
  };
}
