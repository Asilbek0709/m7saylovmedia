import { createClient } from "@/lib/supabase/server";

/** Тур мониторинга (010-tours-evidence-audit.sql). */
export interface MonitoringPeriod {
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  status: "open" | "closed";
  createdAt: string;
}

/**
 * Туры, свежие сверху. null — таблицы ещё нет (база до 010): тогда
 * калькулятор принимает тур свободным текстом, как раньше.
 */
export async function getMonitoringPeriods(): Promise<MonitoringPeriod[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("monitoring_periods")
    .select("name, starts_on, ends_on, status, created_at")
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn("[MS-7] Туры не прочитаны:", error.message);
    }
    return null;
  }

  return (data ?? []).map((row) => ({
    name: row.name as string,
    startsOn: (row.starts_on as string | null) ?? null,
    endsOn: (row.ends_on as string | null) ?? null,
    status: row.status === "closed" ? "closed" : "open",
    createdAt: row.created_at as string,
  }));
}
