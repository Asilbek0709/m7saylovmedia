"use client";

import * as React from "react";
import { Check, Link2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  findMatches,
  searchGlossary,
  type GlossaryTerm,
} from "@/lib/glossary";
import { cn } from "@/lib/utils";

/** Текст с подсвеченными совпадениями запроса. */
function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = findMatches(text, query);
  if (!ranges.length) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([from, to], i) => {
    if (from > pos) parts.push(text.slice(pos, from));
    parts.push(
      <mark
        key={i}
        className="rounded-sm bg-amber-200/80 px-0.5 text-foreground dark:bg-amber-400/30"
      >
        {text.slice(from, to)}
      </mark>,
    );
    pos = to;
  });
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

export function GlossarySearch({
  terms,
  sources,
  altLang = "en",
  initialQuery,
}: {
  terms: GlossaryTerm[];
  sources: string[];
  /** Язык второй подписи термина: обычно английский, в английской версии — узбекский. */
  altLang?: string;
  initialQuery: string;
}) {
  const t = useTranslations("glossary");
  const [query, setQuery] = React.useState(initialQuery);
  const deferred = React.useDeferredValue(query);
  const [copied, setCopied] = React.useState<number | null>(null);

  const hits = React.useMemo(() => searchGlossary(terms, deferred), [terms, deferred]);
  const searching = deferred.trim().length > 0;

  // Запрос — в адресе, чтобы поиском можно было поделиться. Без навигации:
  // страница не перерисовывается на сервере на каждую букву.
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (deferred.trim()) url.searchParams.set("q", deferred.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  }, [deferred]);

  const copyLink = async (n: number) => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = `term-${n}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(n);
      setTimeout(() => setCopied((c) => (c === n ? null : c)), 1500);
    } catch {
      // Буфер обмена недоступен (нет https или запрещён) — хотя бы адрес в строке.
      window.history.replaceState(window.history.state, "", url);
    }
  };

  return (
    <>
      {/* Поиск прилипает под шапкой сайта. */}
      <div className="sticky top-16 z-30 -mx-4 mt-6 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <label htmlFor="glossary-q" className="sr-only">
          {t("search")}
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="glossary-q"
            type="search"
            value={query}
            placeholder={t("search")}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            className="h-11 pr-10 pl-9 text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clear")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {searching
            ? t("found", { count: hits.length, total: terms.length })
            : `${t("count", { count: terms.length })} · ${t("searchHint")}`}
        </p>
      </div>

      {searching && hits.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("empty", { query: deferred.trim() })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        <ol className="mt-4 space-y-4" lang="uz-Cyrl">
          {hits.map(({ term, rank }) => (
            <li
              key={term.n}
              id={`term-${term.n}`}
              className="ms7-surface scroll-mt-40 rounded-lg border border-border bg-card p-5 target:ring-2 target:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">
                    <span className="mr-2 text-muted-foreground tabular">{term.n}.</span>
                    <Highlight text={term.term} query={deferred} />
                  </h2>
                  {term.en && (
                    <p lang={altLang} className="mt-0.5 text-sm text-muted-foreground italic">
                      <Highlight text={term.en} query={deferred} />
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(term.n)}
                  title={t("copyLink")}
                  aria-label={copied === term.n ? t("copied") : t("copyLink")}
                  className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {copied === term.n ? (
                    <Check className="size-4" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                </button>
              </div>
              {searching && rank === 1 && (
                <p className="mt-1 text-[11px] text-muted-foreground">{t("inText")}</p>
              )}

              <dl className="mt-3 space-y-2.5 text-sm leading-relaxed">
                {term.sections.map((section, i) => (
                  <div key={i} className={cn(i === 0 && "text-foreground")}>
                    {section.label && (
                      <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        <Highlight text={section.label} query={deferred} />
                      </dt>
                    )}
                    <dd className={cn(i === 0 ? "text-foreground" : "text-muted-foreground")}>
                      <Highlight text={section.text} query={deferred} />
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      )}

      {!searching && sources.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">{t("sources")}</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {sources.map((source) => (
              <li key={source} className="[overflow-wrap:anywhere]">
                {source}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
