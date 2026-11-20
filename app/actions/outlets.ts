"use server";

import { refresh } from "next/cache";

import { canWrite, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Ownership = "davlat" | "nodavlat";

export interface OutletInput {
  name: string;
  website: string;
  ownership: Ownership;
  region: string;
}

export type OutletResult =
  | { ok: true; id: string; name: string }
  | {
      ok: false;
      reason:
        | "unavailable"
        | "unauthorized"
        | "pending"
        | "invalid"
        | "duplicate"
        | "adminOnly"
        | "hasEvaluations"
        | "failed";
    };

/** Поля издания в том виде, в каком их хранит таблица. */
function normalize(input: OutletInput) {
  const name = input.name?.trim() ?? "";
  const ownership: Ownership =
    input.ownership === "davlat" ? "davlat" : "nodavlat";
  // Схему адреса не храним — в таблице лежит домен вида «kun.uz».
  const website =
    input.website?.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "") ||
    null;
  const region = input.region?.trim() || "Тошкент";
  return { name, ownership, website, region };
}


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

/** Добавление издания в справочник мониторинга. Только для эксперта. */
export async function createOutlet(input: OutletInput): Promise<OutletResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };
  if (!canWrite(user)) return { ok: false, reason: "pending" };

  const fields = normalize(input);
  if (!fields.name) return { ok: false, reason: "invalid" };

  const { data, error } = await supabase
    .from("media_outlets")
    .insert({ ...fields, slug: slugify(fields.name) })
    .select("id, name")
    .single();

  if (error) {
    // 23505 = unique_violation: издание с таким slug уже заведено.
    if (error.code === "23505") return { ok: false, reason: "duplicate" };
    return { ok: false, reason: "failed" };
  }

  refresh();
  return { ok: true, id: data.id as string, name: data.name as string };
}

/**
 * Правка издания: название, сайт, собственность, регион. slug не меняется —
 * на него ссылаются адреса страниц изданий.
 */
export async function updateOutlet(
  id: string,
  input: OutletInput,
): Promise<OutletResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };
  if (!canWrite(user)) return { ok: false, reason: "pending" };

  const fields = normalize(input);
  if (!fields.name) return { ok: false, reason: "invalid" };

  const { data, error } = await supabase
    .from("media_outlets")
    .update(fields)
    .eq("id", id)
    .select("id, name");

  if (error) {
    if (error.code === "23505") return { ok: false, reason: "duplicate" };
    return { ok: false, reason: "failed" };
  }
  // RLS молча отсекает строку, если правка не разрешена.
  if (!data?.length) return { ok: false, reason: "failed" };

  refresh();
  return { ok: true, id, name: data[0].name as string };
}

/**
 * Удаление издания — только администратор. Издание с оценками база не
 * удалит (010: ON DELETE RESTRICT), чтобы не стереть оценки экспертов.
 */
export async function deleteOutlet(id: string): Promise<OutletResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };
  if (user.role !== "admin") return { ok: false, reason: "adminOnly" };

  const { data, error } = await supabase
    .from("media_outlets")
    .delete()
    .eq("id", id)
    .select("id");

  // 23503 = foreign_key_violation: у издания есть оценки.
  if (error?.code === "23503") return { ok: false, reason: "hasEvaluations" };
  if (error || !data?.length) return { ok: false, reason: "failed" };

  refresh();
  return { ok: true, id, name: "" };
}
