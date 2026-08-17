import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  Layers,
  MessagesSquare,
  Network,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AnimatedHeading } from "@/components/motion/animated-heading";
import { FadeIn } from "@/components/motion/fade-in";
import { Reveal } from "@/components/motion/reveal";
import { SmsiBadge } from "@/components/smsi-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MS7_CRITERIA, SMSI_BANDS, type CriterionId } from "@/lib/ms7";


const TILE: Record<CriterionId, { span: string; icon: typeof ShieldCheck }> = {
  legal: { span: "lg:col-span-3", icon: ShieldCheck },
  quality: { span: "lg:col-span-3", icon: FileSearch },
  speed: { span: "lg:col-span-2", icon: Zap },
  multimedia: { span: "lg:col-span-2", icon: Layers },
  interactivity: { span: "lg:col-span-2", icon: MessagesSquare },
  engagement: { span: "lg:col-span-3", icon: Users },
  convergence: { span: "lg:col-span-3", icon: Network },
};

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("criteria");
  const tb = await getTranslations("bands");

  return (
    <div className="flex flex-col">
      
      <section className="relative overflow-hidden">
        
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_srgb,var(--primary)_9%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_50%_at_50%_0%,#000,transparent)]"
        />

        <div className="mx-auto w-full max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl">
            <FadeIn>
              <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {t("eyebrow")}
              </span>
            </FadeIn>

            <AnimatedHeading
              text={t("title")}
              className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
            />

            <FadeIn delay={0.25}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("subtitle")}
              </p>
            </FadeIn>

            <FadeIn delay={0.35}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="group">
                  <Link href="/calculator">
                    {t("ctaPrimary")}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/methodology">{t("ctaSecondary")}</Link>
                </Button>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.45}>
            <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-border pt-8">
              {[
                { value: "7", label: t("stats.criteria") },
                { value: "100", label: t("stats.scale") },
                { value: "5", label: t("stats.levels") },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {stat.value}
                  </dt>
                  <dd className="mt-1 text-xs leading-snug text-muted-foreground">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </FadeIn>
        </div>
      </section>

      
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {t("model.eyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-foreground">
              {t("model.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("model.subtitle")}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {MS7_CRITERIA.map((criterion, index) => {
              const tile = TILE[criterion.id];
              const Icon = tile.icon;
              const name = tc(`${criterion.id}.name`);
              const latin = tc(`${criterion.id}.latin`);
              
              const showLatin = latin.toLowerCase() !== name.toLowerCase();

              return (
                <Reveal
                  key={criterion.id}
                  className={tile.span}
                  delay={0.05 * index}
                >
                  <Card className="ms7-surface group h-full gap-0 py-5 transition-colors hover:border-ring/40">
                    <CardContent className="flex h-full flex-col px-5">
                      <div className="flex items-start justify-between gap-3">
                        <span
                          aria-hidden
                          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
                        >
                          <Icon className="size-4.5" />
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground tabular">
                          {t("model.weight")} {criterion.weight.toFixed(2)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                        {name}
                      </h3>
                      {showLatin && (
                        <p className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                          {latin}
                        </p>
                      )}
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {tc(`${criterion.id}.description`)}
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {t("scale.eyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-foreground">
              {t("scale.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("scale.subtitle")}
            </p>
          </Reveal>

          
          <Reveal delay={0.06}>
            <ul className="mt-10 grid gap-3">
              {SMSI_BANDS.map((band) => (
                <li
                  key={band.id}
                  
                  className="flex flex-col items-start gap-2 rounded-md border border-border bg-card px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2"
                >
                  <span className="shrink-0 text-sm font-semibold text-foreground tabular sm:w-20">
                    {band.min}–{band.max}
                  </span>
                  <SmsiBadge
                    band={band}
                    label={tb(`${band.id}.label`)}
                    size="sm"
                    className="min-w-0"
                  />
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {tb(`${band.id}.interpretation`)}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-lg border border-border bg-card px-6 py-10 sm:px-10 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
                  {t("cta.title")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("cta.subtitle")}
                </p>
              </div>
              <Button asChild size="lg" className="group shrink-0">
                <Link href="/calculator">
                  {t("cta.button")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
