import { DEMO_PERIOD, DEMO_RANKINGS } from "@/lib/demo-data";
import { calculateSMSI } from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

/** Живые цифры для главной: из публичных итогов, без закрытых оценок. */
export interface LandingStats {
  /** Изданий в справочнике. */
  outlets: number;
  /** Сколько из них уже оценено. */
  rated: number;
  /** Оценок экспертов (по всем турам). */
  evaluations: number;
  /** Регионов, где есть оценённые издания. */
  regions: number;
  recent: RecentEvaluation[];
}

export interface RecentEvaluation {
  slug: string;
  name: string;
  website: string | null;
  region: string;
  period: string;
  evaluatedAt: string;
  smsi: number;
  prevSmsi: number | null;
}

const RECENT = 6;

export async function getLandingStats(): Promise<LandingStats> {
  const supabase = await createClient();
  if (supabase) {
    try {
      const [{ count }, { data, error }] = await Promise.all([
        supabase.from("media_outlets").select("id", { count: "exact", head: true }),
        supabase
          .from("media_dynamics")
          .select("outlet_id, slug, name, website, region, period, evaluated_at, smsi, prev_smsi, experts")
          .order("evaluated_at", { ascending: false }),
      ]);
      if (!error && data) {
        const rated = new Set(data.map((r) => r.outlet_id as string));
        const regions = new Set(
          data.map((r) => (r.region as string | null)?.trim()).filter(Boolean),
        );
        return {
          outlets: count ?? rated.size,
          rated: rated.size,
          evaluations: data.reduce((s, r) => s + Number(r.experts ?? 1), 0),
          regions: regions.size,
          recent: data.slice(0, RECENT).map((r) => ({
            slug: r.slug as string,
            name: r.name as string,
            website: (r.website as string | null) ?? null,
            region: (r.region as string) ?? "",
            period: r.period as string,
            evaluatedAt: (r.evaluated_at as string) ?? "",
            smsi: Number(r.smsi),
            prevSmsi: r.prev_smsi === null ? null : Number(r.prev_smsi),
          })),
        };
      }
    } catch {
      // Ниже — демо-набор.
    }
  }

  const demo = DEMO_RANKINGS.map((row) => ({ row, smsi: calculateSMSI(row) }))
    .sort((a, b) => b.smsi - a.smsi);
  return {
    outlets: DEMO_RANKINGS.length,
    rated: DEMO_RANKINGS.length,
    evaluations: DEMO_RANKINGS.length,
    regions: new Set(DEMO_RANKINGS.map((r) => r.region)).size,
    recent: demo.slice(0, RECENT).map(({ row, smsi }) => ({
      slug: row.slug,
      name: row.name,
      website: row.website,
      region: row.region,
      period: DEMO_PERIOD,
      evaluatedAt: "",
      smsi,
      prevSmsi: null,
    })),
  };
}
