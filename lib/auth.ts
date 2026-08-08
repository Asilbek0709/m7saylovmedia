import { cache } from "react";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * pending — зарегистрировался, но право записи ещё не выдано;
 * expert / admin — подтверждён, может вносить оценки и издания.
 * Роль хранится в public.profiles (supabase/002-roles.sql).
 */
export type UserRole = "pending" | "expert" | "admin";

export interface SessionUser {
  id: string;
  email: string | null;
  role: UserRole;
  fullName: string | null;
}

/** Право записи. Совпадает с public.is_expert() в БД. */
export function canWrite(user: SessionUser | null): boolean {
  return user?.role === "expert" || user?.role === "admin";
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

  try {
    // Именно getUser(), а не getSession(): getUser проверяет токен на сервере
    // Supabase, а данные сессии из куки можно подделать.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    // Роль приходит из public.profiles. Если миграция 002 ещё не выполнена
    // или профиля нет — считаем pending: без права записи, но вход работает.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .maybeSingle();

    // 42P01 = таблицы нет: миграция 002-roles.sql не выполнена. Роль при этом
    // падает в pending (запрет записи), поэтому причину нужно назвать вслух —
    // иначе это выглядит как «аккаунт не подтвердили».
    if (profileError?.code === "42P01") {
      console.warn(
        "[MS-7] Таблица public.profiles не найдена. Выполните supabase/002-roles.sql — " +
          "без неё сохранение оценок недоступно всем пользователям.",
      );
    }

    const role = (profile?.role ?? "pending") as UserRole;

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      role,
      fullName: (profile?.full_name as string | null) ?? null,
    };
  } catch {
    // Сеть недоступна — считаем, что пользователь не вошёл, но страницу не роняем.
    return null;
  }
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
