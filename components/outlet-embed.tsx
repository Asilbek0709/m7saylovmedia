"use client";

import * as React from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const LANGS = [
  { id: "uz", label: "Oʻzbekcha" },
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
] as const;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Блок «Значок для сайта»: превью, язык и код для вставки. */
export function OutletEmbed({
  slug,
  name,
  defaultLang,
  labels,
}: {
  slug: string;
  name: string;
  defaultLang: string;
  labels: { title: string; subtitle: string; code: string; copy: string; copied: string; language: string };
}) {
  const [lang, setLang] = React.useState(
    LANGS.some((l) => l.id === defaultLang) ? defaultLang : "uz",
  );
  const [copied, setCopied] = React.useState(false);
  const [origin, setOrigin] = React.useState("https://www.m7saylovmedia.uz");

  React.useEffect(() => {
    // Код должен вести на тот адрес, где открыт сайт (прод, превью).
    const id = window.setTimeout(() => setOrigin(window.location.origin), 0);
    return () => window.clearTimeout(id);
  }, []);

  const src = `${origin}/badge/${slug}.svg?lang=${lang}`;
  const code = `<a href="${origin}/outlets/${slug}" target="_blank" rel="noopener" title="MS-7: Saylov-Media — ${name}"><img src="${src}" alt="MS-7 SMSI — ${name}" height="48"></a>`;

  return (
    <div className="ms7-surface mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">{labels.title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{labels.subtitle}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="rounded-lg border border-dashed border-border bg-background p-4">
          {/* Внешняя SVG-картинка с нашего же домена: next/image не нужен. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={src} src={src} alt="" height={48} className="h-12 w-auto" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={labels.language}>
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              className={
                lang === l.id
                  ? "rounded-md border border-gold bg-gold-wash px-2.5 py-1 text-xs font-medium text-gold-ink"
                  : "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="embed-code">
        {labels.code}
      </label>
      <textarea
        id="embed-code"
        readOnly
        value={code}
        rows={3}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-1.5 w-full resize-none rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={async () => {
          if (await copyText(code)) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? labels.copied : labels.copy}
      </Button>
    </div>
  );
}

/** «Поделиться»: на телефоне — системное меню (Telegram и т. д.), иначе — копия ссылки. */
export function ShareButton({
  title,
  labels,
}: {
  title: string;
  labels: { share: string; copied: string };
}) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        const url = window.location.href.split("#")[0];
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch (error) {
            // Отменил — ничего не делаем; иначе ниже копируем ссылку.
            if (error instanceof DOMException && error.name === "AbortError") return;
          }
        }
        if (await copyText(url)) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? labels.copied : labels.share}
    </Button>
  );
}
