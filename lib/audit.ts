import { MS7_CRITERIA, type CriterionId } from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

/** Запись журнала изменений оценок (010-tours-evidence-audit.sql). */
export interface AuditEntry {
  id: number;
  action: "insert" | "update" | "delete";
  changedAt: string;
  period: string;
  outletName: string;
  outletSlug: string | null;
  /** Чья оценка. */
  evaluator: string | null;
  /** Кто изменил; null — изменение не через сайт (SQL Editor). */
  actor: string | null;
  smsiBefore: number | null;
  smsiAfter: number | null;
  /** Изменившиеся мезоны: было → стало. */
  scoreChanges: { id: CriterionId; before: number | null; after: number | null }[];
  evidenceChanged: boolean;
  periodChanged: { before: string; after: string } | null;
}

type Snapshot = Record<string, unknown> | null;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Последние изменения оценок. Журнал читает только администратор (RLS).
 * null — таблицы ещё нет: 010 не выполнена.
 */
export async function getAuditLog(limit = 100): Promise<AuditEntry[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("evaluation_audit")
    .select("id, outlet_id, period, evaluator_id, actor_id, action, old_data, new_data, changed_at")
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn("[MS-7] Журнал не прочитан:", error.message);
    }
    return null;
  }
  if (!data?.length) return [];

  // Связей у журнала нет (строки переживают удаление), имена — отдельно.
  const outletIds = [...new Set(data.map((r) => r.outlet_id as string))];
  const userIds = [
    ...new Set(
      data.flatMap((r) => [r.evaluator_id, r.actor_id]).filter(Boolean) as string[],
    ),
  ];
  const [{ data: outlets }, { data: profiles }] = await Promise.all([
    supabase.from("media_outlets").select("id, name, slug").in("id", outletIds),
    userIds.length
      ? supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const outletById = new Map(
    (outlets ?? []).map((o) => [o.id as string, { name: o.name as string, slug: o.slug as string }]),
  );
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      ((p.full_name as string | null) || (p.email as string | null)) ?? null,
    ]),
  );

  return data.map((row) => {
    const before = row.old_data as Snapshot;
    const after = row.new_data as Snapshot;
    const outlet = outletById.get(row.outlet_id as string);
    return {
      id: Number(row.id),
      action: row.action as AuditEntry["action"],
      changedAt: row.changed_at as string,
      period: row.period as string,
      outletName: outlet?.name ?? "—",
      outletSlug: outlet?.slug ?? null,
      evaluator: row.evaluator_id ? (nameById.get(row.evaluator_id as string) ?? null) : null,
      actor: row.actor_id ? (nameById.get(row.actor_id as string) ?? null) : null,
      smsiBefore: num(before?.smsi),
      smsiAfter: num(after?.smsi),
      scoreChanges:
        before && after
          ? MS7_CRITERIA.filter((c) => !same(before[c.id], after[c.id])).map((c) => ({
              id: c.id,
              before: num(before[c.id]),
              after: num(after[c.id]),
            }))
          : [],
      evidenceChanged:
        Boolean(before && after) && !same(before?.evidence, after?.evidence),
      periodChanged:
        before && after && before.period !== after.period
          ? { before: String(before.period), after: String(after.period) }
          : null,
    };
  });
}
