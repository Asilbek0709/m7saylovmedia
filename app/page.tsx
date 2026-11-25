import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  MapPin,
  Newspaper,
  TrendingDown,
  TrendingUp,
  Layers,
  MessagesSquare,
  Network,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { AnimatedHeading } from "@/components/motion/animated-heading";
import { CountUp } from "@/components/motion/count-up";
import { FadeIn } from "@/components/motion/fade-in";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { HeroVisual } from "@/components/motion/hero-visual";
import { Reveal } from "@/components/motion/reveal";
import { ScrollFormula } from "@/components/motion/scroll-formula";
import { StaggerItem, StaggerList } from "@/components/motion/stagger-list";
import { OutletLogo } from "@/components/outlet-logo";
import { SmsiBadge } from "@/components/smsi-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateSMSI,
  DEFAULT_SCORES,
  MS7_CRITERIA,
  resolveBand,
  SMSI_BANDS,
  type CriterionId,
} from "@/lib/ms7";
import { getLongDateFormatter } from "@/lib/format-date";
import { getLandingStats } from "@/lib/landing-stats";
import { regionLabel } from "@/lib/regions";
import { getWeightHistory } from "@/lib/weights";


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

  const locale = await getLocale();
  const stats = await getLandingStats();
  const formatDate = await getLongDateFormatter();

  // Модель на главной — с действующими весами из базы (в демо — из кода).
  const { weights } = (await getWeightHistory()).active;
  const profileBand = resolveBand(calculateSMSI(DEFAULT_SCORES, true, weights));
  const formulaSteps = MS7_CRITERIA.map((criterion) => ({
    id: criterion.id,
    weight: weights[criterion.id],
    value: DEFAULT_SCORES[criterion.id],
    short: tc(`${criterion.id}.short`),
    name: tc(`${criterion.id}.name`),
  }));

  return (
    <div className="flex flex-col">
      
      <section className="relative overflow-hidden">
        <HeroBackdrop />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:grid-cols-[minmax(0,1fr)_440px] xl:gap-20">
          <div className="min-w-0">
          <div className="max-w-3xl">
            <FadeIn>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                <span aria-hidden className="size-1.5 rounded-full bg-gold" />
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
                { value: 7, label: t("stats.criteria") },
                { value: 100, label: t("stats.scale") },
                { value: 5, label: t("stats.levels") },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-3xl font-semibold tracking-tight text-foreground tabular sm:text-4xl">
                    <CountUp value={stat.value} />
                  </dt>
                  <dd className="mt-1 text-xs leading-snug text-muted-foreground">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </FadeIn>
          </div>

          {/* Справа — живая иллюстрация модели; на телефонах — под текстом. */}
          <FadeIn delay={0.3} className="px-4 sm:px-0">
            <HeroVisual
              weights={weights}
              labels={{
                codes: MS7_CRITERIA.map((c) => tc(`${c.id}.code`)),
                bands: Object.fromEntries(
                  SMSI_BANDS.map((b) => [b.id, tb(`${b.id}.label`)]),
                ),
                title: t("visual.title"),
                round: t.raw("visual.round") as string,
                growth: t("visual.growth"),
              }}
            />
          </FadeIn>
        </div>
      </section>

      {/* ---------------- Платформа в цифрах: живые данные ---------------- */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-gold-ink uppercase">
              {t("live.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("live.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t("live.subtitle")}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Newspaper, value: stats.outlets, label: t("live.outlets") },
                { icon: ClipboardCheck, value: stats.rated, label: t("live.rated") },
                { icon: Users, value: stats.evaluations, label: t("live.evaluations") },
                { icon: MapPin, value: stats.regions, label: t("live.regions"), suffix: " / 14" },
              ].map((tile, i) => (
                <Reveal key={tile.label} delay={0.05 * i}>
                  <Card className="ms7-surface group h-full gap-0 overflow-hidden py-5 transition-transform duration-300 hover:-translate-y-0.5">
                    <CardContent className="relative px-5">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-gold-wash text-gold-ink">
                        <tile.icon aria-hidden className="size-5" />
                      </span>
                      <p className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground tabular">
                        <CountUp value={tile.value} />
                        {tile.suffix && (
                          <span className="text-lg font-semibold text-muted-foreground">
                            {tile.suffix}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        {tile.label}
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.1}>
              <Card className="ms7-surface h-full gap-0 py-0">
                <CardContent className="px-0">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <p className="font-display text-base font-semibold text-foreground">
                      {t("live.recent")}
                    </p>
                    <Link
                      href="/rating"
                      className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {t("live.allRating")}
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  </div>
                  {stats.recent.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                      {t("live.empty")}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {stats.recent.map((item) => {
                        const band = resolveBand(item.smsi);
                        const delta = item.prevSmsi === null ? null : item.smsi - item.prevSmsi;
                        return (
                          <li key={`${item.slug}|${item.period}`}>
                            <Link
                              href={`/outlets/${item.slug}`}
                              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                            >
                              <OutletLogo name={item.name} website={item.website} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {item.name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {[
                                    item.region && regionLabel(item.region, locale),
                                    item.period,
                                    item.evaluatedAt && formatDate(item.evaluatedAt),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </span>
                              {delta !== null && Math.abs(delta) >= 0.05 && (
                                <span
                                  className="hidden items-center gap-1 text-xs font-medium tabular sm:inline-flex"
                                  style={{ color: delta > 0 ? "var(--smsi-high)" : "var(--smsi-poor)" }}
                                >
                                  {delta > 0 ? (
                                    <TrendingUp aria-hidden className="size-3.5" />
                                  ) : (
                                    <TrendingDown aria-hidden className="size-3.5" />
                                  )}
                                  {delta > 0 ? "+" : ""}
                                  {delta.toFixed(1)}
                                </span>
                              )}
                              <span className="flex shrink-0 flex-col items-end gap-1">
                                <span
                                  className="font-display text-lg leading-none font-bold tabular"
                                  style={{ color: band.color }}
                                >
                                  {item.smsi.toFixed(1)}
                                </span>
                                <SmsiBadge band={band} label={tb(`${band.id}.label`)} size="sm" />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          </div>
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
                          {t("model.weight")} {weights[criterion.id].toFixed(2)}
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
              {t("formula.eyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-foreground">
              {t("formula.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("formula.subtitle")}
            </p>
          </Reveal>

          <ScrollFormula
            steps={formulaSteps}
            bandLabel={tb(`${profileBand.id}.label`)}
            bandColor={profileBand.color}
            labels={{
              contribution: t("formula.contribution"),
              running: t("formula.running"),
              total: t("formula.total"),
              score: t("formula.score"),
              weight: t("formula.weight"),
              profile: t("formula.profile"),
            }}
          />
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
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

          
          <StaggerList className="mt-10 grid gap-3">
            {SMSI_BANDS.map((band) => (
              <StaggerItem
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
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      
      <section className="border-t border-border">
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
