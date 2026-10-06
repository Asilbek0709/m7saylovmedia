import {
  MS7_CRITERIA,
  WEIGHTS_VERSION,
  type CriterionId,
} from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

export interface WeightSet {
  /** Номер версии: 1, 2, 3… */
  id: number;
  /** ISO-дата, с которой оценки считаются этим набором. */
  validFrom: string | null;
  weights: Record<CriterionId, number>;
  note: string | null;
}

export interface WeightHistory {
  /** По возрастанию версии. */
  sets: WeightSet[];
  /** Набор, которым считаются новые оценки. */
  active: WeightSet;
  /**
   * Мезоны, у которых вес в интерфейсе (lib/ms7.ts) отличается от
   * действующего набора базы. Пусто — источники совпадают.
   */
  mismatch: CriterionId[];
  /** Номер версии в интерфейсе отличается от действующей в базе. */
  versionMismatch: boolean;
  /** false — наборы не прочитаны из базы, показана версия из кода. */
  live: boolean;
}

const COLUMNS = MS7_CRITERIA.map((c) => c.id).join(", ");

/** Набор весов, зашитый в интерфейс, — на случай демо-режима. */
export const BUILTIN_WEIGHT_SET: WeightSet = {
  id: WEIGHTS_VERSION,
  validFrom: null,
  weights: Object.fromEntries(
    MS7_CRITERIA.map((c) => [c.id, c.weight]),
  ) as Record<CriterionId, number>,
  note: null,
};

/** Сравнение с точностью до тысячных — так веса хранятся в базе. */
export function weightMismatch(set: WeightSet): CriterionId[] {
  return MS7_CRITERIA.filter(
    (c) => Math.abs(set.weights[c.id] - c.weight) > 0.0005,
  ).map((c) => c.id);
}

/** Действующий набор на дату: последний с valid_from не позже неё. */
export function activeWeightSet(sets: WeightSet[], date: string): WeightSet {
  const valid = sets.filter((s) => !s.validFrom || s.validFrom <= date);
  return valid[valid.length - 1] ?? sets[0];
}

function summarize(sets: WeightSet[], live: boolean): WeightHistory {
  const active = activeWeightSet(sets, new Date().toISOString().slice(0, 10));
  return {
    sets,
    active,
    mismatch: weightMismatch(active),
    versionMismatch: active.id !== WEIGHTS_VERSION,
    live,
  };
}

export async function getWeightHistory(): Promise<WeightHistory> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("weight_sets")
        .select(`id, valid_from, note, ${COLUMNS}`)
        .order("id");

      if (error?.code === "42P01" || error?.code === "PGRST205") {
        console.warn(
          "[MS-7] Таблицы weight_sets нет. Выполните supabase/006-weight-sets.sql — " +
            "без неё смена весов пересчитает индексы прошлых туров.",
        );
      }

      if (!error && data?.length) {
        const sets = (data as unknown as Record<string, unknown>[]).map(
          (row) => ({
            id: Number(row.id),
            validFrom: (row.valid_from as string | null) ?? null,
            note: (row.note as string | null) ?? null,
            weights: Object.fromEntries(
              MS7_CRITERIA.map((c) => [c.id, Number(row[c.id])]),
            ) as Record<CriterionId, number>,
          }),
        );

        const history = summarize(sets, true);
        if (history.mismatch.length || history.versionMismatch) {
          console.warn(
            `[MS-7] Веса интерфейса (lib/ms7.ts, версия ${WEIGHTS_VERSION}) ` +
              `расходятся с действующим набором базы (версия ${history.active.id}): ` +
              (history.mismatch.join(", ") || "номер версии"),
          );
        }
        return history;
      }
    } catch {}
  }

  return summarize([BUILTIN_WEIGHT_SET], false);
}
