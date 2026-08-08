"use server";

import { refresh } from "next/cache";

import { canWrite, getCurrentUser } from "@/lib/auth";
import {
  calculateSMSI,
  MS7_CRITERIA,
  SCORE_MAX,
  SCORE_MIN,
  type CriteriaScores,
} from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

export interface SaveEvaluationInput {
  /** Идентификатор существующего издания, если эксперт выбрал его в поиске. */
  outletId: string | null;
  outletName: string;
  period: string;
  scores: CriteriaScores;
}

export type SaveEvaluationResult =
  | { ok: true; outletName: string; smsi: number }
  | {
      ok: false;
      reason: "unavailable" | "unauthorized" | "pending" | "invalid" | "failed";
    };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Slug для media_outlets.slug (он UNIQUE). Названия бывают кириллическими
 * («UzA — Ўзбекистон МА»), латиница из них не извлекается, поэтому в таком
 * случае берётся детерминированный хэш — повторное сохранение того же
 * издания не создаст дубль.
 */
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

/**
 * Сохранение оценки эксперта. Это единственная операция записи в системе,
 * поэтому именно она закрыта авторизацией: рейтинг и калькулятор публичны.
 *
 * Проверка пользователя делается здесь, рядом с записью, а не только в
 * proxy.ts — прокси даёт лишь оптимистичный редирект.
 */
export async function saveEvaluation(
  input: SaveEvaluationInput,
): Promise<SaveEvaluationResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };

  // Регистрация открыта, поэтому одного факта входа мало: писать может
  // только подтверждённый эксперт. То же правило продублировано в RLS
  // (public.is_expert), так что запрос не пройдёт даже в обход этой проверки.
  if (!canWrite(user)) return { ok: false, reason: "pending" };

  const outletName = input.outletName?.trim() ?? "";
  const period = input.period?.trim() ?? "";
  if (!outletName || !period) return { ok: false, reason: "invalid" };

  // Баллы приходят с клиента — доверять им нельзя.
  const scores = {} as CriteriaScores;
  for (const criterion of MS7_CRITERIA) {
    const raw = Number(input.scores?.[criterion.id]);
    if (!Number.isFinite(raw)) return { ok: false, reason: "invalid" };

    const value = Math.round(raw);
    if (value < SCORE_MIN || value > SCORE_MAX) {
      return { ok: false, reason: "invalid" };
    }
    scores[criterion.id] = value;
  }

  let outletId = input.outletId;

  // Идентификатор из демо-набора — это slug, а не UUID: его в базу слать нельзя.
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

  const { error } = await supabase.from("evaluations").upsert(
    {
      outlet_id: outletId,
      period,
      evaluator: user.email,
      ...scores,
    },
    { onConflict: "outlet_id,period" },
  );

  if (error) return { ok: false, reason: "failed" };

  // Рейтинг рисуется на сервере — без этого он остался бы со старыми данными.
  refresh();

  return { ok: true, outletName, smsi: calculateSMSI(scores) };
}
