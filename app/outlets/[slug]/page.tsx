import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, FileText, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { OutletDynamics } from "@/components/outlet-dynamics";
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
import { formatScore, MS7_CRITERIA, resolveBand } from "@/lib/ms7";
import { getOutletHistory } from "@/lib/rankings";
import { cn } from "@/lib/utils";
import { buildRecommendations } from "@/lib/recommendations";

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const history = await getOutletHistory(slug);
  const t = await getTranslations("outlet");

  return { title: history?.name ?? t("notFound") };
}

export default async function OutletPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const history = await getOutletHistory(slug);
  if (!history || history.points.length === 0) notFound();

  const t = await getTranslations("outlet");
  const tc = await getTranslations("criteria");
  const tb = await getTranslations("bands");
  const tr = await getTranslations("rating");
  const tCommon = await getTranslations("common");
  const tReport = await getTranslations("report");

  const points = history.points;
  const last = points[points.length - 1];
  const prev = points.length >= 2 ? points[points.length - 2] : null;
  const band = resolveBand(last.smsi);
  const delta = prev ? last.smsi - prev.smsi : null;
  const consensus = last.consensus;

  const criteria = MS7_CRITERIA.map((criterion) => ({
    id: criterion.id,
    short: tc(`${criterion.id}.short`),
    name: tc(`${criterion.id}.name`),
    weight: criterion.weight,
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

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
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
              <span>{history.region}</span>
              <span className="tabular">
                {t("rounds", { count: points.length })}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("currentIndex")}
            </p>
            <p
              className="mt-1 text-4xl leading-none font-semibold tracking-tight tabular"
              style={{ color: band.color }}
            >
              {last.smsi.toFixed(1)}
            </p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <SmsiBadge band={band} label={tb(`${band.id}.label`)} size="sm" />
              {delta !== null && (
                <span className="text-xs font-medium text-muted-foreground tabular">
                  {signed(delta)}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {t("period")}: {last.period}
          {last.weightSetId !== null && (
            <span> · {t("weightsVersion", { id: last.weightSetId })}</span>
          )}
        </p>

        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href={`/outlets/${history.slug}/report`}>
            <FileText className="size-4" />
            {tReport("open")}
          </Link>
        </Button>
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
        <Recommendations plan={buildRecommendations(last, { smsi: last.smsi })} className="mt-6" />
      </Reveal>
    </div>
  );
}
