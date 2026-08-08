/**
 * Ключевое свойство для демо: пока переменные окружения не заданы, платформа
 * работает в демо-режиме — авторизация недоступна, маршруты НЕ закрываются,
 * рейтинг берётся из lib/demo-data.ts. Показ не может сорваться из-за сети
 * или незаполненного .env.local.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Маршруты, закрытые для неавторизованных.
 *
 * Пусто намеренно: рейтинг, калькулятор и методика публичны — методика
 * прямо описывает рейтинг как инструмент прозрачности для ЦИК, АИМК и
 * редакций. Авторизация закрывает не просмотр, а запись: сохранение оценок
 * в app/actions/evaluations.ts. Массив оставлен как точка расширения.
 */
export const PROTECTED_PREFIXES: readonly string[] = [];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
