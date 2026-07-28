import { cache } from "react";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Data Access Layer: авторитетная проверка пользователя рядом с данными.
 * Проверка в proxy.ts — только оптимистичная (так рекомендует Next), поэтому
 * решение о доступе принимается здесь.
 *
 * `cache()` — чтобы несколько вызовов в одном рендере дали один запрос.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  // Именно getUser(), а не getSession(): getUser проверяет токен на сервере
  // Supabase, а данные сессии из куки можно подделать.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
});

/**
 * Требует вошедшего пользователя. В демо-режиме (Supabase не настроен)
 * пропускает: иначе незаполненный .env.local закрыл бы всю платформу
 * прямо на презентации.
 */
export async function requireUser(
  returnTo: string,
): Promise<SessionUser | null> {
  if (!isSupabaseConfigured) return null;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}
