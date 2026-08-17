import { cache } from "react";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";


export type UserRole = "pending" | "expert" | "admin";

export interface SessionUser {
  id: string;
  email: string | null;
  role: UserRole;
  fullName: string | null;
}


export function canWrite(user: SessionUser | null): boolean {
  return user?.role === "expert" || user?.role === "admin";
}


export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  try {

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;


    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .maybeSingle();


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

    return null;
  }
});


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
