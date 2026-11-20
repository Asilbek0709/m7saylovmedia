"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";

import { getCurrentUser, type UserRole } from "@/lib/auth";
import { MS7_CRITERIA, type CriterionId } from "@/lib/ms7";
import { createClient } from "@/lib/supabase/server";

type Failure =
  | "unavailable"
  | "forbidden"
  | "invalid"
  | "lastAdmin"
  | "tooMany"
  | "duplicate"
  | "failed";
export type AdminResult = { ok: true } | { ok: false; reason: Failure };

const ROLES: UserRole[] = ["pending", "expert", "admin"];

/** Права дублирует база (008-admin.sql); здесь — понятный ответ интерфейсу. */
async function adminClient() {
  const supabase = await createClient();
  if (!supabase) return { error: "unavailable" as const };
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "forbidden" as const };
  return { supabase, user };
}

export async function setUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminResult> {
  const ctx = await adminClient();
  if ("error" in ctx) return { ok: false, reason: ctx.error! };
  if (!ROLES.includes(role)) return { ok: false, reason: "invalid" };

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("id");

  if (error) {
    // Триггер 008 не даёт снять роль с последнего администратора.
    return {
      ok: false,
      reason: /последнего администратора/.test(error.message)
        ? "lastAdmin"
        : "failed",
    };
  }
  if (!data?.length) return { ok: false, reason: "forbidden" };

  refresh();
  return { ok: true };
}

export interface WeightSetInput {
  validFrom: string;
  note: string;
  weights: Record<CriterionId, number>;
}

/**
 * Новая версия весов. Дата начала — не раньше сегодняшней и позже всех
 * прежних версий: набор задним числом поменял бы смысл уже идущего тура.
 */
export async function addWeightSet(
  input: WeightSetInput,
): Promise<AdminResult> {
  const ctx = await adminClient();
  if ("error" in ctx) return { ok: false, reason: ctx.error! };

  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validFrom) || input.validFrom < today) {
    return { ok: false, reason: "invalid" };
  }

  // Веса хранятся с точностью до тысячных; сумма должна быть ровно 1.
  const weights = {} as Record<CriterionId, number>;
  let sumThousandths = 0;
  for (const c of MS7_CRITERIA) {
    const thousandths = Math.round(Number(input.weights?.[c.id]) * 1000);
    if (!Number.isFinite(thousandths) || thousandths < 0 || thousandths > 1000) {
      return { ok: false, reason: "invalid" };
    }
    weights[c.id] = thousandths / 1000;
    sumThousandths += thousandths;
  }
  if (sumThousandths !== 1000) return { ok: false, reason: "invalid" };

  const { data: latest, error: readError } = await ctx.supabase
    .from("weight_sets")
    .select("id, valid_from")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return { ok: false, reason: "failed" };
  if (latest && input.validFrom <= (latest.valid_from as string)) {
    return { ok: false, reason: "invalid" };
  }

  const { error } = await ctx.supabase.from("weight_sets").insert({
    id: (latest ? Number(latest.id) : 0) + 1,
    valid_from: input.validFrom,
    note: input.note.trim() || null,
    ...weights,
  });
  if (error) return { ok: false, reason: "failed" };

  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Туры мониторинга (010-tours-evidence-audit.sql)                     */
/* ------------------------------------------------------------------ */

export interface PeriodInput {
  name: string;
  startsOn: string;
  endsOn: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function readPeriod(input: PeriodInput) {
  const name = input.name?.trim().replace(/\s+/g, " ") ?? "";
  const startsOn = input.startsOn?.trim() || null;
  const endsOn = input.endsOn?.trim() || null;
  if (!name || name.length > 120) return null;
  if ((startsOn && !DATE_RE.test(startsOn)) || (endsOn && !DATE_RE.test(endsOn))) {
    return null;
  }
  if (startsOn && endsOn && endsOn < startsOn) return null;
  return { name, starts_on: startsOn, ends_on: endsOn };
}

/** Новый тур — открытый: эксперты сразу могут вносить в него оценки. */
export async function createPeriod(input: PeriodInput): Promise<AdminResult> {
  const ctx = await adminClient();
  if ("error" in ctx) return { ok: false, reason: ctx.error! };

  const row = readPeriod(input);
  if (!row) return { ok: false, reason: "invalid" };

  const { error } = await ctx.supabase
    .from("monitoring_periods")
    .insert({ ...row, status: "open" });
  if (error) {
    return { ok: false, reason: error.code === "23505" ? "duplicate" : "failed" };
  }

  refresh();
  return { ok: true };
}

/**
 * Правка тура: даты и название. Переименование база переносит на все
 * оценки тура (on update cascade), в том числе в закрытом туре.
 */
export async function updatePeriod(
  name: string,
  input: PeriodInput,
): Promise<AdminResult> {
  const ctx = await adminClient();
  if ("error" in ctx) return { ok: false, reason: ctx.error! };

  const row = readPeriod(input);
  if (!row) return { ok: false, reason: "invalid" };

  const { data, error } = await ctx.supabase
    .from("monitoring_periods")
    .update(row)
    .eq("name", name)
    .select("name");
  if (error) {
    return { ok: false, reason: error.code === "23505" ? "duplicate" : "failed" };
  }
  if (!data?.length) return { ok: false, reason: "forbidden" };

  refresh();
  return { ok: true };
}

/** Закрытый тур замораживает оценки: их нельзя добавить, изменить, удалить. */
export async function setPeriodStatus(
  name: string,
  status: "open" | "closed",
): Promise<AdminResult> {
  const ctx = await adminClient();
  if ("error" in ctx) return { ok: false, reason: ctx.error! };
  if (status !== "open" && status !== "closed") {
    return { ok: false, reason: "invalid" };
  }

  const { data, error } = await ctx.supabase
    .from("monitoring_periods")
    .update({ status })
    .eq("name", name)
    .select("name");
  if (error) return { ok: false, reason: "failed" };
  if (!data?.length) return { ok: false, reason: "forbidden" };

  refresh();
  return { ok: true };
}

/**
 * Письмо со ссылкой для сброса пароля. Пароль администратор не видит и не
 * задаёт — только запускает тот же сценарий, что «Забыли пароль?».
 *
 * Ссылку откроет эксперт в своём браузере, поэтому шаблон письма «Reset
 * Password» в Supabase должен вести на /auth/callback?token_hash=…:
 * ссылка по умолчанию (PKCE) работает только в браузере, где её запросили.
 */
export async function sendPasswordReset(userId: string): Promise<AdminResult> {
  const ctx = await adminClient();
  if ("error" in ctx) return { ok: false, reason: ctx.error! };

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const email = profile?.email as string | undefined;
  if (!email) return { ok: false, reason: "invalid" };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const { error } = await ctx.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=%2Freset-password`,
  });
  if (error) {
    return { ok: false, reason: error.status === 429 ? "tooMany" : "failed" };
  }
  return { ok: true };
}
