"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Спокойные фоны для инициалов — по хешу названия, чтобы цвет не прыгал. */
const TINTS = [
  ["#e7eef7", "#0f2a47"],
  ["#fdf3e2", "#8a5300"],
  ["#e6f2ec", "#2d6a4f"],
  ["#efeaf7", "#4b3b78"],
  ["#f7e9e7", "#7a2e25"],
  ["#e8f1f4", "#1f5566"],
] as const;

function initials(name: string): string {
  const words = name
    .replace(/https?:\/\//, "")
    .split(/[\s.\-—/()«»]+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

function domainOf(website: string | null | undefined): string | null {
  if (!website) return null;
  const host = website.trim().replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  return /\.[a-z]{2,}$/i.test(host) ? host.toLowerCase() : null;
}

/**
 * Логотип издания: иконка его сайта (через сервис значков Google), а пока
 * она грузится или если её нет — инициалы на цветном фоне.
 */
export function OutletLogo({
  name,
  website,
  className,
}: {
  name: string;
  website: string | null | undefined;
  className?: string;
}) {
  const domain = domainOf(website);
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  // Google отдаёт заглушку 16×16, если иконки нет: её не показываем.
  const check = React.useCallback((img: HTMLImageElement) => {
    if (img.naturalWidth <= 16) setFailed(true);
    else setLoaded(true);
  }, []);
  // Картинка из серверной разметки может загрузиться раньше, чем React
  // навесит onLoad, — тогда проверяем её сразу при подключении.
  const attach = React.useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) check(img);
    },
    [check],
  );

  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const [bg, fg] = TINTS[Math.abs(hash) % TINTS.length];

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border text-[11px] font-semibold",
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {!loaded && initials(name)}
      {domain && !failed && (
        // Внешняя картинка малого размера: next/image здесь не нужен.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          ref={attach}
          onLoad={(e) => check(e.currentTarget)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 size-full bg-white object-contain p-1.5",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </span>
  );
}
