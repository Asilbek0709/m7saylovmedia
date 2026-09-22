import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { OutletDynamics } from "@/components/outlet-dynamics";
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
import { MS7_CRITERIA, resolveBand } from "@/lib/ms7";
import { getOutletHistory } from "@/lib/rankings";

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

  const points = history.points;
  const last = points[points.length - 1];
  const prev = points.length >= 2 ? points[points.length - 2] : null;
  const band = resolveBand(last.smsi);
  const delta = prev ? last.smsi - prev.smsi : null;

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
        </p>
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
                          {criterion.current}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular">
                          {criterion.previous ?? "—"}
                        </TableCell>
                        <TableCell className="pr-6 text-right text-sm text-foreground tabular">
                          {diff === null
                            ? "—"
                            : `${diff > 0 ? "+" : ""}${diff}`}
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
    </div>
  );
}
