import { DEMO_PERIOD, DEMO_RANKINGS, type RankingRow } from "@/lib/demo-data";
import { calculateSMSI, type CriteriaScores } from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

export interface RankedOutlet extends RankingRow {
  rank: number;
  smsi: number;
}

export interface RankingsResult {
  rows: RankedOutlet[];
  period: string;

  live: boolean;
}

const rank = (rows: RankingRow[]): RankedOutlet[] =>
  rows
    .map((row) => ({ ...row, smsi: calculateSMSI(row as CriteriaScores) }))
    .sort((a, b) => b.smsi - a.smsi || a.name.localeCompare(b.name))
    .map((row, i) => ({ ...row, rank: i + 1 }));


export async function getRankings(limit = 10): Promise<RankingsResult> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("media_rankings")
        .select(
          "outlet_id, name, slug, website, ownership, region, period, legal, quality, speed, multimedia, interactivity, engagement, convergence, smsi",
        )
        .order("smsi", { ascending: false })
        .limit(limit);

      if (!error && data?.length) {
        const fetched = data as unknown as (RankingRow & {
          smsi: number;
          period: string;
        })[];

        return {
          rows: fetched.map((row, i) => ({ ...row, rank: i + 1 })),
          period: fetched[0].period ?? DEMO_PERIOD,
          live: true,
        };
      }
    } catch {

    }
  }

  return {
    rows: rank(DEMO_RANKINGS).slice(0, limit),
    period: DEMO_PERIOD,
    live: false,
  };
}
