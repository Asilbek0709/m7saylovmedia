import type { SessionUser } from "@/lib/auth";
import {
  MS7_CRITERIA,
  type CriteriaScores,
  type IndicatorScores,
} from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

/**
 * Индивидуальные оценки экспертов. Публично они закрыты (007-experts.sql):
 * RLS отдаёт эксперту только его строки, администратору — все. Поэтому
 * все запросы здесь идут от имени вошедшего пользователя.
 */
export interface EvaluationRecord {
  id: string;
  outletId: string;
  outletName: string;
  outletSlug: string;
  period: string;
  evaluatedAt: string;
  scores: CriteriaScores;
  smsi: number;
  weightSetId: number | null;
  indicators: IndicatorScores | null;
  evaluatorId: string | null;
  /** Заполняется только в запросах администратора. */
  evaluator: { email: string | null; fullName: string | null } | null;
}

/** Итог тура издания — публичный агрегат, к которому относится оценка. */
export interface RoundSummary {
  experts: number;
  smsi: number;
  smsiRange: number;
  needsConsensus: boolean;
}

const SCORE_COLUMNS = MS7_CRITERIA.map((c) => c.id).join(", ");
const BASE = `id, outlet_id, period, evaluated_at, smsi, ${SCORE_COLUMNS}, media_outlets(name, slug)`;

type Row = Record<string, unknown> & {
  media_outlets?: { name: string; slug: string } | null;
  profiles?: { email: string | null; full_name: string | null } | null;
};

function toRecord(row: Row): EvaluationRecord {
  return {
    id: row.id as string,
    outletId: row.outlet_id as string,
    outletName: row.media_outlets?.name ?? "—",
    outletSlug: row.media_outlets?.slug ?? "",
    period: row.period as string,
    evaluatedAt: (row.evaluated_at as string) ?? "",
    scores: Object.fromEntries(
      MS7_CRITERIA.map((c) => [c.id, Number(row[c.id])]),
    ) as CriteriaScores,
    smsi: Number(row.smsi),
    weightSetId:
      row.weight_set_id === undefined || row.weight_set_id === null
        ? null
        : Number(row.weight_set_id),
    indicators: (row.indicators as IndicatorScores | null | undefined) ?? null,
    evaluatorId: (row.evaluator_id as string | null | undefined) ?? null,
    evaluator: row.profiles
      ? { email: row.profiles.email, fullName: row.profiles.full_name }
      : null,
  };
}

const roundKey = (outletId: string, period: string) => `${outletId}|${period}`;

/** Итоги туров для набора оценок; пусто — база до 007-experts.sql. */
export async function getRoundSummaries(
  records: EvaluationRecord[],
): Promise<Map<string, RoundSummary>> {
  const result = new Map<string, RoundSummary>();
  const supabase = await createClient();
  if (!supabase || records.length === 0) return result;

  const { data, error } = await supabase
    .from("evaluation_rounds")
    .select("outlet_id, period, experts, smsi, smsi_range, needs_consensus")
    .in("outlet_id", [...new Set(records.map((r) => r.outletId))]);
  if (error || !data) return result;

  for (const row of data) {
    result.set(roundKey(row.outlet_id as string, row.period as string), {
      experts: Number(row.experts),
      smsi: Number(row.smsi),
      smsiRange: Number(row.smsi_range ?? 0),
      needsConsensus: Boolean(row.needs_consensus),
    });
  }
  return result;
}

export function summaryFor(
  summaries: Map<string, RoundSummary>,
  record: EvaluationRecord,
): RoundSummary | null {
  return summaries.get(roundKey(record.outletId, record.period)) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Кабинет эксперта                                                   */
/* ------------------------------------------------------------------ */

export async function getMyEvaluations(
  user: SessionUser,
): Promise<EvaluationRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("evaluations")
    .select(`${BASE}, weight_set_id, indicators, evaluator_id`)
    .eq("evaluator_id", user.id)
    .order("evaluated_at", { ascending: false })
    .order("period", { ascending: false });

  if (!error) return (data as unknown as Row[]).map(toRecord);

  // До 007 эксперт хранился текстом — ищем по email.
  if (error.code === "42703" && user.email) {
    const legacy = await supabase
      .from("evaluations")
      .select(BASE)
      .eq("evaluator", user.email)
      .order("evaluated_at", { ascending: false });
    if (!legacy.error) return (legacy.data as unknown as Row[]).map(toRecord);
  }
  return [];
}

/**
 * Оценка для правки в калькуляторе. Только своя: калькулятор сохраняет
 * от имени вошедшего, и правка чужой оценки создала бы новую строку.
 */
export async function getOwnEvaluation(
  user: SessionUser,
  id: string,
): Promise<EvaluationRecord | null> {
  const supabase = await createClient();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;

  const { data, error } = await supabase
    .from("evaluations")
    .select(`${BASE}, weight_set_id, indicators, evaluator_id`)
    .eq("id", id)
    .eq("evaluator_id", user.id)
    .maybeSingle();

  return error || !data ? null : toRecord(data as unknown as Row);
}

/* ------------------------------------------------------------------ */
/*  Панель администратора                                              */
/* ------------------------------------------------------------------ */

export async function getEvaluationsForAdmin(filter: {
  period?: string | null;
  outletIds?: string[];
}): Promise<EvaluationRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from("evaluations")
    .select(
      `${BASE}, weight_set_id, evaluator_id, profiles(email, full_name)`,
    )
    .order("period")
    .order("smsi", { ascending: false });
  if (filter.period) query = query.eq("period", filter.period);
  if (filter.outletIds) query = query.in("outlet_id", filter.outletIds);

  const { data, error } = await query;
  return error || !data ? [] : (data as unknown as Row[]).map(toRecord);
}

/** Туры, по убыванию свежести: из публичных итогов, чтобы не тянуть все строки. */
export async function getPeriods(): Promise<string[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("media_dynamics")
    .select("period, evaluated_at")
    .order("evaluated_at", { ascending: false });

  return [...new Set((data ?? []).map((row) => row.period as string))];
}

export interface ConsensusRound {
  outletId: string;
  outletName: string;
  outletSlug: string;
  period: string;
  experts: number;
  smsi: number;
  smsiRange: number;
}

export async function getRoundsNeedingConsensus(): Promise<ConsensusRound[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("media_dynamics")
    .select("outlet_id, name, slug, period, experts, smsi, smsi_range")
    .eq("needs_consensus", true)
    .order("smsi_range", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => ({
    outletId: row.outlet_id as string,
    outletName: row.name as string,
    outletSlug: row.slug as string,
    period: row.period as string,
    experts: Number(row.experts),
    smsi: Number(row.smsi),
    smsiRange: Number(row.smsi_range),
  }));
}

export interface ProfileRecord {
  id: string;
  email: string | null;
  fullName: string | null;
  organization: string | null;
  role: "pending" | "expert" | "admin";
  createdAt: string;
}

export async function getProfiles(): Promise<ProfileRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, organization, role, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    email: (row.email as string | null) ?? null,
    fullName: (row.full_name as string | null) ?? null,
    organization: (row.organization as string | null) ?? null,
    role: row.role as ProfileRecord["role"],
    createdAt: row.created_at as string,
  }));
}
