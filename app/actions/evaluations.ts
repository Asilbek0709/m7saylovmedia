"use server";

import { refresh } from "next/cache";

import { canWrite, getCurrentUser } from "@/lib/auth";
import {
  calculateSMSI,
  MS7_CRITERIA,
  SCORE_MAX,
  SCORE_MIN,
  scoresFromIndicators,
  type CriteriaScores,
  type CriterionId,
  type IndicatorScores,
} from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

export interface SaveEvaluationInput {

  outletId: string | null;
  outletName: string;
  period: string;
  scores: CriteriaScores;
  indicators?: IndicatorScores | null;
  /** Обоснование: комментарий и ссылки по мезонам и общий (010). */
  evidence?: Evidence | null;
}

/** Ключи — id мезонов и «general». */
export type Evidence = Partial<Record<CriterionId | "general", string>>;

const MAX_INDICATORS = 12;
const MAX_EVIDENCE = 2000;

function readEvidence(raw: unknown): Evidence | null {
  if (!raw || typeof raw !== "object") return null;
  const keys: (CriterionId | "general")[] = [
    ...MS7_CRITERIA.map((c) => c.id),
    "general",
  ];
  const result: Evidence = {};
  for (const key of keys) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const text = value.trim().slice(0, MAX_EVIDENCE);
    if (text) result[key] = text;
  }
  return Object.keys(result).length ? result : null;
}

function validScore(raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isInteger(value)) return null;
  return value >= SCORE_MIN && value <= SCORE_MAX ? value : null;
}

function readIndicators(raw: unknown): IndicatorScores | null {
  if (!raw || typeof raw !== "object") return null;

  const result = {} as IndicatorScores;
  for (const criterion of MS7_CRITERIA) {
    const list = (raw as Record<string, unknown>)[criterion.id];
    if (!Array.isArray(list) || list.length === 0 || list.length > MAX_INDICATORS) {
      return null;
    }
    const values = list.map(validScore);
    if (values.some((v) => v === null)) return null;
    result[criterion.id] = values as number[];
  }
  return result;
}

export type SaveEvaluationResult =
  | { ok: true; outletName: string; smsi: number }
  | {
      ok: false;
      reason:
        | "unavailable"
        | "unauthorized"
        | "pending"
        | "invalid"
        | "closed"
        | "unknownPeriod"
        | "failed";
    };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


function slugify(name: string): string {
  const latin = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (latin) return latin.slice(0, 60);

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return `outlet-${(hash >>> 0).toString(36)}`;
}


export async function saveEvaluation(
  input: SaveEvaluationInput,
): Promise<SaveEvaluationResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };


  if (!canWrite(user)) return { ok: false, reason: "pending" };

  const outletName = input.outletName?.trim() ?? "";
  const period = input.period?.trim() ?? "";
  if (!outletName || !period) return { ok: false, reason: "invalid" };


  let indicators: IndicatorScores | null = null;
  let scores = {} as CriteriaScores;

  if (input.indicators) {
    indicators = readIndicators(input.indicators);
    if (!indicators) return { ok: false, reason: "invalid" };
    scores = scoresFromIndicators(indicators);
  } else {
    for (const criterion of MS7_CRITERIA) {
      const value = validScore(Math.round(Number(input.scores?.[criterion.id])));
      if (value === null) return { ok: false, reason: "invalid" };
      scores[criterion.id] = value;
    }
  }

  let outletId = input.outletId;


  if (!outletId || !UUID_RE.test(outletId)) {
    const { data, error } = await supabase
      .from("media_outlets")
      .upsert({ name: outletName, slug: slugify(outletName) }, {
        onConflict: "slug",
      })
      .select("id")
      .single();

    if (error || !data) return { ok: false, reason: "failed" };
    outletId = data.id as string;
  }

  const row = {
    outlet_id: outletId,
    period,
    evaluator: user.email,
    ...scores,
  };

  // Попытки от новой схемы базы к старой: база может отставать от кода.
  //   007 — у каждого эксперта своя строка тура;
  //   005 — оценка по индикаторам;
  //   до 005 — только баллы мезонов.
  // Индекс считает база по набору весов оценки (006-weight-sets.sql),
  // поэтому эксперту возвращается сохранённое значение, а не пересчёт.
  //   010 — обоснование оценки (без неё обоснование не сохраняется).
  const evidence = readEvidence(input.evidence);
  const attempts = [
    ...(evidence
      ? [
          {
            payload: { ...row, evaluator_id: user.id, indicators, evidence },
            onConflict: "outlet_id,period,evaluator_id",
          },
        ]
      : []),
    {
      payload: { ...row, evaluator_id: user.id, indicators },
      onConflict: "outlet_id,period,evaluator_id",
    },
    { payload: { ...row, indicators }, onConflict: "outlet_id,period" },
    ...(indicators ? [] : [{ payload: row, onConflict: "outlet_id,period" }]),
  ];

  let saved: { smsi: unknown } | null = null;
  let error: { code?: string; message?: string } | null = null;

  for (const [i, attempt] of attempts.entries()) {
    ({ data: saved, error } = await supabase
      .from("evaluations")
      .upsert(attempt.payload, { onConflict: attempt.onConflict })
      .select("smsi")
      .single());

    // 42703 — нет колонки, PGRST204 — PostgREST не знает колонку из тела
    // запроса, 42P10 — нет ограничения уникальности под onConflict.
    if (!error || !["42703", "PGRST204", "42P10"].includes(error.code ?? "")) {
      break;
    }

    const step = i - (evidence ? 1 : 0);
    console.warn(
      step < 0
        ? "[MS-7] Колонки evaluations.evidence нет. Выполните " +
            "supabase/010-tours-evidence-audit.sql — без неё обоснование не сохраняется."
        : step === 0
          ? "[MS-7] База без supabase/007-experts.sql: оценка второго эксперта " +
              "перезапишет первого. Выполните миграцию."
          : "[MS-7] Колонки evaluations.indicators нет. Выполните supabase/005-indicators.sql — " +
              "без неё оценка по индикаторам не сохраняется.",
    );
  }

  if (error) return { ok: false, reason: saveFailure(error) };


  refresh();

  const smsi =
    saved?.smsi === undefined || saved?.smsi === null
      ? calculateSMSI(scores)
      : Number(saved.smsi);

  return { ok: true, outletName, smsi };
}

/**
 * Отказы базы, о которых эксперту стоит сказать прямо:
 * 23514 — тур закрыт (триггер 010), 23503 — такого тура нет (010).
 */
function saveFailure(error: { code?: string; message?: string }) {
  if (error.code === "23514" && /закрыт/.test(error.message ?? "")) return "closed";
  if (error.code === "23503" && /period/.test(error.message ?? "")) {
    return "unknownPeriod";
  }
  return "failed";
}

export type DeleteEvaluationResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unavailable" | "unauthorized" | "forbidden" | "closed" | "failed";
    };

/**
 * Удаление оценки. Права проверяет база (007-experts.sql): эксперт удаляет
 * только свою строку, администратор — любую. Чужая строка просто не
 * найдётся — это и есть отказ.
 */
export async function deleteEvaluation(
  id: string,
): Promise<DeleteEvaluationResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };
  if (!canWrite(user) || !UUID_RE.test(id)) {
    return { ok: false, reason: "forbidden" };
  }

  const { data, error } = await supabase
    .from("evaluations")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return {
      ok: false,
      reason: saveFailure(error) === "closed" ? "closed" : "failed",
    };
  }
  if (!data?.length) return { ok: false, reason: "forbidden" };

  refresh();
  return { ok: true };
}
