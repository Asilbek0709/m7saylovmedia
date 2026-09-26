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
  type IndicatorScores,
} from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

export interface SaveEvaluationInput {

  outletId: string | null;
  outletName: string;
  period: string;
  scores: CriteriaScores;
  indicators?: IndicatorScores | null;
}

const MAX_INDICATORS = 12;

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
      reason: "unavailable" | "unauthorized" | "pending" | "invalid" | "failed";
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

  let { error } = await supabase
    .from("evaluations")
    .upsert({ ...row, indicators }, { onConflict: "outlet_id,period" });

  if (error?.code === "42703") {
    console.warn(
      "[MS-7] Колонки evaluations.indicators нет. Выполните supabase/005-indicators.sql — " +
        "без неё оценка по индикаторам не сохраняется.",
    );
    if (indicators) return { ok: false, reason: "failed" };
    ({ error } = await supabase
      .from("evaluations")
      .upsert(row, { onConflict: "outlet_id,period" }));
  }

  if (error) return { ok: false, reason: "failed" };


  refresh();

  return { ok: true, outletName, smsi: calculateSMSI(scores) };
}
