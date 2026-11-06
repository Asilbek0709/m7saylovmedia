/**
 * Адрес, куда вернуть пользователя после входа или ссылки из письма.
 * Только путь внутри сайта: «/my», «/rating?x=1». Всё остальное —
 * «https://…», «//чужой.сайт», «/\чужой.сайт» — превращается в fallback,
 * иначе ссылкой вида /login?next=https://… можно увести человека на
 * чужой сайт сразу после входа.
 */
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  return raw;
}

/** Кука, по которой страница смены пароля узнаёт вход по ссылке из письма. */
export const RECOVERY_COOKIE = "ms7-recovery";
/** Сколько секунд после перехода по ссылке можно задать пароль без старого. */
export const RECOVERY_TTL = 15 * 60;
