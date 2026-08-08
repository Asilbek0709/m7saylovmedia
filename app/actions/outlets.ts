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
        | "failed";
    };

/**
 * Slug обязан быть уникальным. Кириллические названия («UzA — Ўзбекистон МА»)
 * латиницы не дают, поэтому для них берётся детерминированный хэш.
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

/** Добавление издания в справочник мониторинга. Только для эксперта. */
export async function createOutlet(input: OutletInput): Promise<OutletResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };
  if (!canWrite(user)) return { ok: false, reason: "pending" };

  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, reason: "invalid" };

  const ownership: Ownership =
    input.ownership === "davlat" ? "davlat" : "nodavlat";

  // Схему адреса не храним — в таблице лежит домен вида «kun.uz».
  const website =
    input.website?.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "") ||
    null;

  const slug = slugify(name);

  const { data, error } = await supabase
    .from("media_outlets")
    .insert({
      name,
      slug,
      website,
      ownership,
      region: input.region?.trim() || "Тошкент",
    })
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

/** Удаление издания вместе с его оценками (ON DELETE CASCADE). */
export async function deleteOutlet(id: string): Promise<OutletResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };
  if (!canWrite(user)) return { ok: false, reason: "pending" };

  const { error } = await supabase.from("media_outlets").delete().eq("id", id);
  if (error) return { ok: false, reason: "failed" };

  refresh();
  return { ok: true, id, name: "" };
}
