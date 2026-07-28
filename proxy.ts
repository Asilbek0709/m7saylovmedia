import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isProtectedPath,
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/config";

/**
 * В Next 16 middleware переименован в proxy. Задачи здесь две:
 *
 * 1. Продлить сессию Supabase — токены живут в куках, и обновить их можно
 *    только там, где есть доступ на запись к ответу.
 * 2. Оптимистичный редирект неавторизованных. Это НЕ основная линия защиты:
 *    авторитетная проверка — в lib/auth.ts рядом с данными, как рекомендует
 *    документация Next.
 *
 * В демо-режиме (Supabase не настроен) прокси не делает ничего.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Вызов обязателен: он и продлевает сессию. Без него куки протухают.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Вошедшему на странице входа делать нечего.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/rating";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Всё, кроме статики и файлов с расширением.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
