/**
 * Ключевое свойство для демо: пока переменные окружения не заданы, платформа
 * работает в демо-режиме — авторизация недоступна, маршруты НЕ закрываются,
 * рейтинг берётся из lib/demo-data.ts. Показ не может сорваться из-за сети
 * или незаполненного .env.local.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Маршруты, доступные только вошедшему эксперту. */
export const PROTECTED_PREFIXES = ["/rating"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
