import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { GlossarySearch } from "@/components/glossary-search";
import { getGlossary } from "@/lib/glossary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("glossary");
  const glossary = getGlossary(await getLocale());
  return { title: t("eyebrow"), description: glossary.subtitle };
}

export default async function GlossaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("glossary");
  const locale = await getLocale();
  const glossary = getGlossary(locale);
  const q = (await searchParams).q;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
        {glossary.subtitle}
      </p>
      {/* Оригинал глоссария — узбекский; на других языках — перевод. */}
      {locale !== "uz" && (
        <p className="mt-1 text-xs text-muted-foreground">{t("langNote")}</p>
      )}

      <GlossarySearch
        // Новый язык — новый список: сбрасываем состояние поиска.
        key={locale}
        terms={glossary.terms}
        sources={glossary.sources}
        altLang={locale === "en" ? "uz-Cyrl" : "en"}
        initialQuery={(Array.isArray(q) ? q[0] : q) ?? ""}
      />
    </div>
  );
}
