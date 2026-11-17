import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { AUTHORS } from "@/lib/authors";

async function content() {
  const locale = await getLocale();
  return AUTHORS[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authors");
  const { intro } = await content();
  return { title: t("eyebrow"), description: intro };
}

/** Страница об авторах — открыта всем, вход не нужен. */
export default async function AuthorsPage() {
  const t = await getTranslations("authors");
  const { intro, registration, authors } = await content();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {intro}
      </p>

      <div className="mt-5 flex max-w-3xl items-start gap-3 rounded-lg border border-border bg-secondary/60 px-4 py-3">
        <BadgeCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-foreground" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("registration")}
          </p>
          <p className="mt-0.5 text-sm text-foreground">{registration}</p>
        </div>
      </div>

      <div className="mt-10 space-y-12">
        {authors.map((author, i) => (
          <article
            key={author.id}
            id={author.id}
            className="grid scroll-mt-24 gap-6 border-t border-border pt-10 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-10"
          >
            <div className="mx-auto w-full max-w-60 sm:mx-0">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted">
                <Image
                  src={author.photo}
                  alt={t("photoAlt", { name: author.name })}
                  fill
                  sizes="(min-width: 640px) 240px, 60vw"
                  className="object-cover object-top"
                  // Первое фото видно сразу — грузим без ленивой загрузки.
                  priority={i === 0}
                />
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-balance text-foreground">
                {author.name}
              </h2>
              <ul className="mt-2 space-y-0.5">
                {author.roles.map((role) => (
                  <li key={role} className="text-sm text-muted-foreground">
                    {role}
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-md border-l-2 border-foreground/70 bg-muted/50 px-4 py-3">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("contribution")}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground">
                  {author.contribution}
                </p>
              </div>

              <div className="mt-6 space-y-5">
                {author.sections.map((section) => (
                  <section key={section.title}>
                    <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {section.title}
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span aria-hidden className="text-muted-foreground">
                            —
                          </span>
                          <span className="min-w-0">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
