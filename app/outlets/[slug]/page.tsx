import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CircleCheck,
  FileText,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { regionLabel } from "@/lib/regions";

import { Reveal } from "@/components/motion/reveal";
import { OutletDynamics } from "@/components/outlet-dynamics";
import { OutletEmbed, ShareButton } from "@/components/outlet-embed";
import { OutletLogo } from "@/components/outlet-logo";
import { Recommendations } from "@/components/recommendations";
import { SmsiBadge } from "@/components/smsi-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatScore,
  MS7_CRITERIA,
  resolveBand,
  SMSI_BANDS,
  strongestCriterion,
  weakestCriterion,
} from "@/lib/ms7";
import { getOutletHistory, getRankings } from "@/lib/rankings";
import { cn } from "@/lib/utils";
import { buildRecommendations } from "@/lib/recommendations";
import { getWeightHistory, weightSetFor } from "@/lib/weights";

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const history = await getOutletHistory(slug);
  const t = await getTranslations("outlet");

  const last = history?.points.at(-1);
  if (!history || !last) return { title: history?.name ?? t("notFound") };
  // Текст под карточкой в Telegram: индекс и уровень сразу видны.
  const tb = await getTranslations("bands");
  const description = `SMSI ${last.smsi.toFixed(1)} — ${tb(`${resolveBand(last.smsi).id}.label`)} · ${last.period}`;
  return {
    title: history.name,
    description,
    openGraph: {
      title: `${history.name} — MS-7: Saylov-Media`,
      description,
      siteName: "MS-7: Saylov-Media",
      type: "website",
    },
  };
}

export default async function OutletPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const locale = await getLocale();
  const { slug } = await params;
  const history = await getOutletHistory(slug);
  if (!history) notFound();

  const t = await getTranslations("outlet");
  const tc = await getTranslations("criteria");
  const tb = await getTranslations("bands");
  const tr = await getTranslations("rating");
  const tCommon = await getTranslations("common");
  const tReport = await getTranslations("report");
  const tp = await getTranslations("outlet.profile");
  const te = await getTranslations("outlet.embed");

  // Издание из справочника без единой оценки: только карточка и путь к оценке.
  if (history.points.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/outlets">
            <ArrowLeft className="size-4" />
            {t("backToOutlets")}
          </Link>
        </Button>
        <p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
          {history.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {history.website && <span>{history.website}</span>}
          <Badge variant="outline" className="font-normal">
            {tr(`ownership.${history.ownership}`)}
          </Badge>
          {history.region && <span>{regionLabel(history.region, locale)}</span>}
        </div>
        <div className="mt-8 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("noEvaluationsTitle")}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("noEvaluationsText")}
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/calculator">{t("evaluateCta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const points = history.points;
  const last = points[points.length - 1];
  const prev = points.length >= 2 ? points[points.length - 2] : null;
  const band = resolveBand(last.smsi);
  const delta = prev ? last.smsi - prev.smsi : null;
  const consensus = last.consensus;
  // Веса той версии, которой посчитан последний тур, — не текущие из кода.
  const weightSet = weightSetFor(await getWeightHistory(), last.weightSetId);

  // Место в текущем рейтинге (если издание в нём есть).
  const { rows: ranking } = await getRankings(null);
  const ranked = ranking.find((r) => r.slug === history.slug) ?? null;
  const strong = strongestCriterion(last);
  const weak = weakestCriterion(last);

  const criteria = MS7_CRITERIA.map((criterion) => ({
    id: criterion.id,
    short: tc(`${criterion.id}.short`),
    name: tc(`${criterion.id}.name`),
    weight: weightSet.weights[criterion.id],
    current: last[criterion.id],
    previous: prev ? prev[criterion.id] : null,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Reveal>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/rating">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>

        {/* Профиль издания: логотип, место, индекс, уровень, сильное и слабое. */}
        <div className="ms7-surface relative mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ backgroundColor: band.color }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-[0.12] blur-3xl"
            style={{ backgroundColor: band.color }}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6 p-5 pt-7 sm:p-7 sm:pt-8">
            <div className="flex min-w-0 items-center gap-4">
              <OutletLogo
                name={history.name}
                website={history.website}
                className="size-16 rounded-2xl text-lg"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {t("eyebrow")}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {history.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  {history.website && <span>{history.website}</span>}
                  <Badge variant="outline" className="font-normal">
                    {tr(`ownership.${history.ownership}`)}
                  </Badge>
                  <span>{regionLabel(history.region, locale)}</span>
                  <span className="tabular">
                    {t("rounds", { count: points.length })}
                  </span>
                </div>
                {ranked && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold-wash px-3 py-1 text-xs font-semibold text-gold-ink">
                    <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                    {tp("rank", { rank: ranked.rank, total: ranking.length })}
                  </p>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("currentIndex")}
              </p>
              <p
                className="mt-1 font-display text-6xl leading-none font-bold tracking-tight tabular"
                style={{ color: band.color }}
              >
                {last.smsi.toFixed(1)}
              </p>
              <div className="mt-2 flex items-center gap-2 sm:justify-end">
                <SmsiBadge band={band} label={tb(`${band.id}.label`)} size="sm" />
                {delta !== null && Math.abs(delta) >= 0.05 && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold tabular"
                    style={{ color: delta > 0 ? "var(--smsi-high)" : "var(--smsi-poor)" }}
                  >
                    {delta > 0 ? (
                      <TrendingUp aria-hidden className="size-3.5" />
                    ) : (
                      <TrendingDown aria-hidden className="size-3.5" />
                    )}
                    {signed(delta)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Шкала уровней с положением издания */}
          <div className="px-5 sm:px-7">
            <div className="relative">
            <div className="flex h-2 overflow-hidden rounded-full">
              {[...SMSI_BANDS].reverse().map((b) => (
                <div
                  key={b.id}
                  title={tb(`${b.id}.label`)}
                  style={{ backgroundColor: b.color, flexGrow: b.max - b.min + 1, opacity: 0.85 }}
                />
              ))}
            </div>
            <span
              aria-hidden
              className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 bg-card shadow-sm"
              style={{
                left: `${Math.min(99, Math.max(1, last.smsi))}%`,
                borderColor: band.color,
              }}
            />
            </div>
          </div>

          <dl className="relative mt-5 grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-3">
            {[
              {
                label: tp("strongest"),
                value: `${tc(`${strong.id}.name`)}`,
                score: last[strong.id],
              },
              {
                label: tp("weakest"),
                value: `${tc(`${weak.id}.name`)}`,
                score: last[weak.id],
              },
              {
                label: tp("experts"),
                value: consensus ? String(consensus.experts) : "—",
                score: null,
              },
            ].map((item) => (
              <div key={item.label} className="bg-card px-5 py-3 sm:px-7">
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {item.label}
                </dt>
                <dd className="mt-0.5 flex items-baseline justify-between gap-2 text-sm font-medium text-foreground">
                  <span className="truncate">{item.value}</span>
                  {item.score !== null && (
                    <span className="font-display text-base font-bold tabular">
                      {formatScore(item.score)}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Без базы баллы — демонстрационные; говорим об этом прямо. */}
        {!history.live && (
          <p
            role="note"
            className="mt-4 rounded-md border border-border bg-secondary px-4 py-3 text-xs leading-relaxed text-secondary-foreground"
          >
            <strong className="font-semibold">{tr("demoNoticeTitle")}</strong>{" "}
            {tr("demoNotice")}
          </p>
        )}

        <p className="mt-3 text-sm text-muted-foreground">
          {t("period")}: {last.period}
          {last.weightSetId !== null && (
            <span> · {t("weightsVersion", { id: last.weightSetId })}</span>
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/outlets/${history.slug}/report`}>
              <FileText className="size-4" />
              {tReport("open")}
            </Link>
          </Button>
          <ShareButton
            title={`${history.name} — SMSI ${last.smsi.toFixed(1)}`}
            labels={{ share: tp("share"), copied: tp("copied") }}
          />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <OutletDynamics
          points={points.map((point, i) => ({
            round: i + 1,
            period: point.period,
            evaluatedAt: point.evaluatedAt,
            smsi: point.smsi,
          }))}
          criteria={criteria}
          labels={{
            dynamicsTitle: t("dynamicsTitle"),
            dynamicsSubtitle: t("dynamicsSubtitle"),
            needMore: t("needMore"),
            profileTitle: t("profileTitle"),
            profileSubtitle: t("profileSubtitle"),
            current: t("current"),
            previous: t("previous"),
            criterion: t("criterion"),
            period: t("period"),
          }}
        />
      </Reveal>

      <Reveal delay={0.14}>
        <Card className="ms7-surface mt-6 overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">{t("breakdownTitle")}</CardTitle>
            <CardDescription>
              {prev ? `${last.period} ← ${prev.period}` : t("noPrevious")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">{t("criterion")}</TableHead>
                    <TableHead className="w-24 text-right">
                      {tCommon("points")}
                    </TableHead>
                    <TableHead className="w-24 text-right">
                      {t("previous")}
                    </TableHead>
                    <TableHead className="w-24 pr-6 text-right">
                      {t("change")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
                  {criteria.map((criterion) => {
                    const diff =
                      criterion.previous === null
                        ? null
                        : criterion.current - criterion.previous;
                    return (
                      <TableRow key={criterion.id}>
                        <TableCell className="pl-6">
                          <span className="block text-sm font-medium text-foreground">
                            {criterion.name}
                          </span>
                          <span className="block text-xs text-muted-foreground tabular">
                            {criterion.weight.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-foreground tabular">
                          {formatScore(criterion.current)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular">
                          {criterion.previous === null
                            ? "—"
                            : formatScore(criterion.previous)}
                        </TableCell>
                        <TableCell className="pr-6 text-right text-sm text-foreground tabular">
                          {diff === null
                            ? "—"
                            : `${diff > 0 ? "+" : ""}${formatScore(Math.round(diff * 10) / 10)}`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {consensus && (
        <Reveal delay={0.16}>
          <Card className="ms7-surface mt-6 overflow-hidden">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    {t("consensus.title")}
                  </CardTitle>
                  <CardDescription>{t("consensus.subtitle")}</CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {t("consensus.experts", { count: consensus.experts })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {consensus.experts < 2 ? (
                <p className="px-6 text-sm text-muted-foreground">
                  {t("consensus.single")}
                </p>
              ) : (
                <>
                  <p
                    role={consensus.needsConsensus ? "alert" : undefined}
                    className={cn(
                      "mx-6 flex items-start gap-2 rounded-md border px-4 py-3 text-sm",
                      consensus.needsConsensus
                        ? "border-destructive/40 bg-destructive/10 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {consensus.needsConsensus ? (
                      <TriangleAlert
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-destructive"
                      />
                    ) : (
                      <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                    )}
                    <span>
                      {consensus.needsConsensus && (
                        <strong className="font-semibold">
                          {t("consensus.flag")}.{" "}
                        </strong>
                      )}
                      {consensus.needsConsensus
                        ? t("consensus.flagText")
                        : t("consensus.ok")}
                    </span>
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-6">
                            {t("consensus.criterion")}
                          </TableHead>
                          <TableHead className="w-24 text-right">
                            {t("consensus.mean")}
                          </TableHead>
                          <TableHead
                            className="w-20 text-right"
                            title={t("consensus.sdHint")}
                          >
                            {t("consensus.sd")}
                          </TableHead>
                          <TableHead
                            className="w-24 pr-6 text-right"
                            title={t("consensus.rangeHint")}
                          >
                            {t("consensus.range")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
                        {criteria.map((criterion) => {
                          const spread = consensus.criteria?.[criterion.id];
                          return (
                            <TableRow key={criterion.id}>
                              <TableCell className="pl-6 text-sm text-foreground">
                                {criterion.name}
                              </TableCell>
                              <TableCell className="text-right text-sm tabular">
                                {formatScore(criterion.current)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground tabular">
                                {spread?.sd == null ? "—" : spread.sd.toFixed(1)}
                              </TableCell>
                              <TableCell className="pr-6 text-right text-sm text-muted-foreground tabular">
                                {spread ? formatScore(spread.range) : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="border-t-2 font-semibold hover:bg-transparent">
                          <TableCell className="pl-6 text-sm">SMSI</TableCell>
                          <TableCell className="text-right text-sm tabular">
                            {last.smsi.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular">
                            {consensus.smsiSd === null
                              ? "—"
                              : consensus.smsiSd.toFixed(1)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "pr-6 text-right text-sm tabular",
                              consensus.needsConsensus && "text-destructive",
                            )}
                          >
                            {consensus.smsiRange.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <p className="border-t border-border px-6 pt-3 text-xs text-muted-foreground">
                    {t("consensus.sd")} — {t("consensus.sdHint")};{" "}
                    {t("consensus.range").toLowerCase()} —{" "}
                    {t("consensus.rangeHint")}.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Reveal delay={0.18}>
        <Recommendations plan={buildRecommendations(last, {
              smsi: last.smsi,
              weights: weightSet.weights,
            })} className="mt-6" />
      </Reveal>

      <Reveal delay={0.2}>
        <OutletEmbed
          slug={history.slug}
          name={history.name}
          defaultLang={locale}
          labels={{
            title: te("title"),
            subtitle: te("subtitle"),
            code: te("code"),
            copy: te("copy"),
            copied: te("copied"),
            language: te("language"),
          }}
        />
      </Reveal>
    </div>
  );
}
