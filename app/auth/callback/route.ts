import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { RECOVERY_COOKIE, RECOVERY_TTL, safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "recovery",
  "email",
  "signup",
  "invite",
  "magiclink",
  "email_change",
];

/**
 * Сюда ведут ссылки из писем Supabase: сброс пароля и подтверждение почты.
 *
 * Понимает оба вида ссылок:
 *   ?token_hash=…&type=recovery — шаблон письма с {{ .TokenHash }}. Работает
 *     на любом устройстве; единственный вариант для ссылки, которую
 *     отправил администратор из панели.
 *   ?code=… — шаблон по умолчанию ({{ .ConfirmationURL }}, PKCE). Работает
 *     только в том браузере, где ссылку запросили.
 *
 * После сброса пароля ставит короткоживущую httpOnly-куку: по ней страница
 * /reset-password разрешает задать пароль без старого. Подделать её из
 * браузера нельзя, а живёт она 15 минут.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const type = OTP_TYPES.includes(typeParam as EmailOtpType)
    ? (typeParam as EmailOtpType)
    : null;

  const isRecovery =
    type === "recovery" ||
    url.searchParams.get("next")?.startsWith("/reset-password") === true;
  const next = safeNext(
    url.searchParams.get("next"),
    isRecovery ? "/reset-password" : "/my",
  );

  const fail = () =>
    NextResponse.redirect(new URL("/login?error=link", request.url));

  // Supabase сам добавляет error=…, если ссылка просрочена или уже использована.
  if (url.searchParams.get("error")) return fail();

  const supabase = await createClient();
  if (!supabase) return fail();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (!ok) return fail();

  const response = NextResponse.redirect(new URL(next, request.url));
  if (isRecovery) {
    response.cookies.set(RECOVERY_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: RECOVERY_TTL,
    });
  }
  return response;
}
