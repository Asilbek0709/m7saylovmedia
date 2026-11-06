import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { PasswordForm } from "@/components/password-form";
import { getCurrentUser } from "@/lib/auth";
import { RECOVERY_COOKIE } from "@/lib/safe-next";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("password.reset");
  return { title: t("titleChange"), robots: { index: false } };
}

/**
 * Один экран на два случая:
 *   — пришли по ссылке из письма (кука от /auth/callback) — задать новый
 *     пароль без старого;
 *   — сменить пароль, будучи в системе, — с подтверждением текущего.
 * Без сессии показывается «ссылка недействительна».
 */
export default async function ResetPasswordPage() {
  const user = isSupabaseConfigured ? await getCurrentUser() : null;
  const recovery = (await cookies()).get(RECOVERY_COOKIE)?.value === "1";

  return (
    <PasswordForm
      email={user?.email ?? null}
      mode={!user ? "invalid" : recovery ? "recovery" : "change"}
      available={isSupabaseConfigured}
    />
  );
}
