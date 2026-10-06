import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { OwnershipRadar } from "@/components/ownership-radar";
import { RatingFilters } from "@/components/rating-filters";
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
  agreementLevel,
  getPeriodAgreement,
  SIGNIFICANCE,
} from "@/lib/agreement";
import { formatScore, MS7_CRITERIA, resolveBand, SMSI_BANDS } from "@/lib/ms7";
import { getRankings } from "@/lib/rankings";
import {
  applySliceFilter,
  groupStats,
  listRegions,
  parseSliceFilter,
  regionStats,
  rerank,
  sliceHref,
  SMALL_SAMPLE,
  type GroupStats,
} from "@/lib/rating-slices";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rating");
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default async function RatingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("rating");
  const tc = await getTranslations("criteria");
  const tb = await getTranslations("bands");
  const tCommon = await getTranslations("common");
  const { rows: allRows, period, live } = await getRankings(null);
  const agreement = live ? await getPeriodAgreement(period) : null;
  const flaggedCount = allRows.filter(
    (row) => row.consensus?.needsConsensus,
  ).length;

  const regions = listRegions(allRows);
  const filter = parseSliceFilter(await searchParams, regions);

  // Таблица и показатели — по полному фильтру. Сравнение собственности
  // учитывает только регион, таблица регионов — только собственность:
  // иначе каждый блок сравнивал бы одну группу саму с собой.
  const rows = rerank(applySliceFilter(allRows, filter));
  const inRegion = applySliceFilter(allRows, { region: filter.region });
  const ofOwnership = applySliceFilter(allRows, {
    ownership: filter.ownership,
  });

  const groups = Object.fromEntries(
    OWNERSHIPS.map((key) => [
      key,
      groupStats(applySliceFilter(inRegion, { ownership: key })),
    ]),
  ) as Record<(typeof OWNERSHIPS)[number], GroupStats>;
  const regionRows = regionStats(ofOwnership);

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const { davlat, nodavlat } = groups;
  const comparison =
    davlat.criteria && nodavlat.criteria && davlat.smsi !== null && nodavlat.smsi !== null
      ? [
          ...MS7_CRITERIA.map((c) => ({
            id: c.id as string,
            code: tc(`${c.id}.code`),
            name: tc(`${c.id}.name`),
            davlat: davlat.criteria![c.id],
            nodavlat: nodavlat.criteria![c.id],
          })),
          {
            id: "smsi",
            code: "SMSI",
            name: "SMSI",
            davlat: davlat.smsi,
            nodavlat: nodavlat.smsi,
          },
        ].map((row) => ({ ...row, diff: round1(row.nodavlat - row.davlat) }))
      : null;

  const overall = groupStats(rows);
  const leader = rows[0];

  const kpis = [
    {
      label: t("kpi.outlets"),
      value: String(rows.length),
      note: t("kpi.outletsNote"),
    },
    {
      label: t("kpi.average"),
      value: overall.smsi === null ? "—" : overall.smsi.toFixed(1),
      note:
        overall.smsi === null
          ? ""
          : tb(`${resolveBand(overall.smsi).id}.label`),
    },
    {
      label: t("kpi.leader"),
      value: leader?.name ?? "—",
      note: leader ? `${leader.smsi.toFixed(1)} ${tCommon("points")}` : "",
    },
    {
      label: t("kpi.criteria"),
      value: "7",
      note: t("kpi.criteriaNote"),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {t("eyebrow")} · {period}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Button asChild>
          <Link href="/calculator">{t("openCalculator")}</Link>
        </Button>
      </Reveal>

      {!live && (
        <Reveal delay={0.05}>
          <div
            role="note"
            className="mt-5 rounded-md border border-border bg-secondary px-4 py-3 text-xs leading-relaxed text-secondary-foreground"
          >
            <strong className="font-semibold">{t("demoNoticeTitle")}</strong>{" "}
            {t("demoNotice")}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.04}>
        <Card className="ms7-surface mt-6 gap-0 py-4">
          <CardContent className="px-4">
            <RatingFilters
              filter={filter}
              regions={regions}
              labels={{
                ownership: t("filters.ownership"),
                region: t("filters.region"),
                allRegions: t("filters.allRegions"),
                reset: t("filters.reset"),
                shareHint: t("filters.shareHint"),
                options: {
                  all: t("filters.all"),
                  davlat: t("filters.davlat"),
                  nodavlat: t("filters.nodavlat"),
                },
              }}
            />
          </CardContent>
        </Card>
      </Reveal>

      {rows.length > 0 && rows.length < SMALL_SAMPLE && (
        <SmallSampleNote text={t("smallSample", { count: rows.length })} />
      )}

      {rows.length === 0 ? (
        <Reveal delay={0.08}>
          <div className="mt-6 rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("empty.title")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty.text")}
            </p>
          </div>
        </Reveal>
      ) : (
      <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((tile, i) => (
          <Reveal key={tile.label} delay={0.06 * i}>
            <Card className="ms7-surface h-full gap-0 py-4">
              <CardContent className="px-4">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {tile.label}
                </p>
                <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-foreground">
                  {tile.value}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {tile.note}
                </p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <Card className="ms7-surface mt-6 overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">{t("tableTitle")}</CardTitle>
            <CardDescription>
              {MS7_CRITERIA.map(
                (c) => `${tc(`${c.id}.code`)} — ${tc(`${c.id}.name`)}`,
              ).join(" · ")}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-0">

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-6 text-center">
                      {t("columns.rank")}
                    </TableHead>
                    <TableHead className="min-w-52">
                      {t("columns.outlet")}
                    </TableHead>
                    <TableHead className="w-32">
                      {t("columns.ownership")}
                    </TableHead>
                    {MS7_CRITERIA.map((c) => (
                      <TableHead
                        key={c.id}
                        title={tc(`${c.id}.name`)}
                        className="w-12 text-center font-medium"
                      >
                        {tc(`${c.id}.code`)}
                      </TableHead>
                    ))}
                    <TableHead className="w-40">{t("columns.smsi")}</TableHead>
                    <TableHead className="w-16 text-right">
                      {t("columns.change")}
                    </TableHead>
                    <TableHead className="w-36 pr-6">
                      {t("columns.band")}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
                  {rows.map((row) => {
                    const band = resolveBand(row.smsi);
                    return (
                      <TableRow key={row.outlet_id}>
                        <TableCell className="pl-6 text-center text-sm font-semibold text-muted-foreground tabular">
                          {row.rank}
                        </TableCell>

                        <TableCell>
                          <Link
                            href={`/outlets/${row.slug}`}
                            className="block text-sm font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {row.name}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            {row.website}
                          </span>
                          {row.consensus?.needsConsensus && (
                            <span
                              title={t("consensusHint", {
                                range: row.consensus.smsiRange.toFixed(1),
                              })}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-destructive"
                            >
                              <TriangleAlert
                                aria-hidden
                                className="size-3 shrink-0"
                              />
                              {t("consensusFlag")}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {t(`ownership.${row.ownership}`)}
                          </Badge>
                        </TableCell>

                        {MS7_CRITERIA.map((c) => (
                          <TableCell
                            key={c.id}
                            className="text-center text-sm text-foreground tabular"
                          >
                            {formatScore(row[c.id])}
                          </TableCell>
                        ))}

                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className="w-10 shrink-0 text-sm font-semibold text-foreground tabular">
                              {row.smsi.toFixed(1)}
                            </span>
                            <span
                              aria-hidden
                              className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
                            >
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${row.smsi}%`,
                                  backgroundColor: band.color,
                                }}
                              />
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right text-sm text-muted-foreground tabular">
                          {row.prevSmsi === null
                            ? "—"
                            : `${row.smsi - row.prevSmsi > 0 ? "+" : ""}${(
                                row.smsi - row.prevSmsi
                              ).toFixed(1)}`}
                        </TableCell>

                        <TableCell className="pr-6">
                          <SmsiBadge
                            band={band}
                            label={tb(`${band.id}.label`)}
                            size="sm"
                          />
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

      <Reveal delay={0.26}>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("scaleLegend")}
          </span>
          {SMSI_BANDS.map((band) => (
            <span key={band.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: band.color }}
              />
              <span className="text-xs text-muted-foreground">
                <span className="tabular">
                  {band.min}–{band.max}
                </span>{" "}
                {tb(`${band.id}.label`)}
              </span>
            </span>
          ))}
        </div>
      </Reveal>
      </>
      )}

      {agreement && (
        <section className="mt-12">
          <Reveal>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {t("agreement.title")}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {t("agreement.subtitle")}
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <Card className="ms7-surface mt-4 gap-0 py-4">
              <CardContent className="px-4">
                {agreement.w === null ? (
                  <p className="text-sm text-muted-foreground">
                    {agreement.experts < 2
                      ? t("agreement.single")
                      : t("agreement.noCommon")}
                  </p>
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                      {[
                        {
                          label: t("agreement.w"),
                          value: agreement.w.toFixed(3),
                          note: `${t("agreement.level")}: ${t(`agreement.levels.${agreementLevel(agreement.w)}`)}`,
                        },
                        {
                          label: t("agreement.experts"),
                          value: String(agreement.experts),
                        },
                        {
                          label: t("agreement.outlets"),
                          value: String(agreement.outlets),
                        },
                        {
                          label: t("agreement.p"),
                          value:
                            agreement.p === null
                              ? "—"
                              : agreement.p < 0.001
                                ? "< 0.001"
                                : agreement.p.toFixed(3),
                          note: `${t("agreement.chi2")} = ${agreement.chi2?.toFixed(2)}, df = ${agreement.df}`,
                        },
                      ].map((item) => (
                        <div key={item.label} className="min-w-0">
                          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                            {item.label}
                          </dt>
                          <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular">
                            {item.value}
                          </dd>
                          {item.note && (
                            <dd className="mt-0.5 text-xs text-muted-foreground">
                              {item.note}
                            </dd>
                          )}
                        </div>
                      ))}
                    </dl>
                    {agreement.p !== null && (
                      <p className="mt-4 text-sm text-foreground">
                        {agreement.p < SIGNIFICANCE
                          ? t("agreement.significant")
                          : t("agreement.notSignificant")}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("agreement.scale")}
                    </p>
                  </>
                )}
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  {t("agreement.flagged", { count: flaggedCount })}
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </section>
      )}

      <section className="mt-12">
        <Reveal>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {t("compare.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("compare.subtitle")} · {filter.region ?? t("compare.allRegions")}
          </p>
        </Reveal>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {OWNERSHIPS.map((key, i) => (
            <Reveal key={key} delay={0.05 * i}>
              <GroupCard
                stats={groups[key]}
                ownership={key}
                title={t(`filters.${key}`)}
                countLabel={
                  groups[key].count
                    ? t("compare.outlets", { count: groups[key].count })
                    : t("compare.noOutlets")
                }
                bandLabel={
                  groups[key].smsi === null
                    ? null
                    : tb(`${resolveBand(groups[key].smsi).id}.label`)
                }
                smallSample={
                  groups[key].count > 0 && groups[key].count < SMALL_SAMPLE
                    ? t("smallSample", { count: groups[key].count })
                    : null
                }
              />
            </Reveal>
          ))}
        </div>

        {comparison ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <Reveal>
              <Card className="ms7-surface h-full">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base">
                    {t("compare.radarTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <OwnershipRadar
                    labels={{
                      davlat: t("filters.davlat"),
                      nodavlat: t("filters.nodavlat"),
                    }}
                    data={comparison
                      .filter((row) => row.id !== "smsi")
                      .map((row) => ({
                        axis: row.code,
                        name: row.name,
                        davlat: row.davlat,
                        nodavlat: row.nodavlat,
                      }))}
                  />
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.06}>
              <Card className="ms7-surface h-full overflow-hidden">
                <CardContent className="px-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-6 sm:min-w-44">
                            {t("compare.criterion")}
                          </TableHead>
                          <TableHead className="w-24 text-right">
                            {t("filters.davlat")}
                          </TableHead>
                          <TableHead className="w-24 text-right">
                            {t("filters.nodavlat")}
                          </TableHead>
                          <TableHead className="w-20 pr-6 text-right">
                            {t("compare.diff")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.map((row) => (
                          <TableRow
                            key={row.id}
                            className={cn(
                              row.id === "smsi" &&
                                "border-t-2 font-semibold hover:bg-transparent",
                            )}
                          >
                            <TableCell className="pl-6 text-sm text-foreground">
                              {row.id === "smsi" ? (
                                "SMSI"
                              ) : (
                                <span title={row.name}>
                                  {row.code}
                                  <span className="hidden sm:inline">
                                    {" "}
                                    — {row.name}
                                  </span>
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular">
                              {row.davlat.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular">
                              {row.nodavlat.toFixed(1)}
                            </TableCell>
                            <TableCell className="pr-6 text-right text-sm text-muted-foreground tabular">
                              {row.diff > 0 ? "+" : ""}
                              {row.diff.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="border-t border-border px-6 pt-3 text-xs text-muted-foreground">
                    {t("compare.diffNote")}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("compare.emptyGroup")}
          </p>
        )}
      </section>

      <section className="mt-12">
        <Reveal>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {t("regions.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("regions.subtitle")}
            {filter.ownership !== "all" &&
              ` · ${t(`filters.${filter.ownership}`)}`}
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <Card className="ms7-surface mt-4 overflow-hidden">
            <CardContent className="px-0">
              {regionRows.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  {t("empty.title")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="min-w-40 pl-6">
                          {t("regions.region")}
                        </TableHead>
                        <TableHead className="w-24 text-right">
                          {t("regions.outlets")}
                        </TableHead>
                        <TableHead className="w-32 text-right">
                          {t("regions.smsi")}
                        </TableHead>
                        <TableHead className="w-44 pr-6">
                          {t("regions.band")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
                      {regionRows.map((row) => {
                        const band = resolveBand(row.smsi);
                        return (
                          <TableRow key={row.region || "—"}>
                            <TableCell className="pl-6 text-sm font-medium text-foreground">
                              {row.region ? (
                                <Link
                                  href={sliceHref({
                                    ...filter,
                                    region: row.region,
                                  })}
                                  scroll={false}
                                  className="underline-offset-4 hover:underline"
                                >
                                  {row.region}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">
                                  {t("regions.unspecified")}
                                </span>
                              )}
                              {row.count < SMALL_SAMPLE && (
                                <span className="ml-1 text-muted-foreground">
                                  *
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular">
                              {row.count}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold tabular">
                              {row.smsi.toFixed(1)}
                            </TableCell>
                            <TableCell className="pr-6">
                              <SmsiBadge
                                band={band}
                                label={tb(`${band.id}.label`)}
                                size="sm"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {(regionRows.some((row) => row.count < SMALL_SAMPLE) ||
                regionRows.length === 1) && (
                <div className="space-y-1 border-t border-border px-6 pt-3 text-xs text-muted-foreground">
                  {regionRows.some((row) => row.count < SMALL_SAMPLE) && (
                    <p>{t("regions.smallNote")}</p>
                  )}
                  {regionRows.length === 1 && <p>{t("regions.single")}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}

const OWNERSHIPS = ["davlat", "nodavlat"] as const;

function SmallSampleNote({ text }: { text: string }) {
  return (
    <div
      role="note"
      className="mt-4 flex items-start gap-2 rounded-md border border-border bg-secondary px-4 py-3 text-xs leading-relaxed text-secondary-foreground"
    >
      <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      {text}
    </div>
  );
}

function GroupCard({
  stats,
  ownership,
  title,
  countLabel,
  bandLabel,
  smallSample,
}: {
  stats: GroupStats;
  ownership: (typeof OWNERSHIPS)[number];
  title: string;
  countLabel: string;
  bandLabel: string | null;
  smallSample: string | null;
}) {
  return (
    <Card className="ms7-surface h-full gap-0 py-4">
      <CardContent className="px-4">
        <p className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <span
            aria-hidden
            className={cn(
              "inline-block w-5 border-t-2",
              ownership === "davlat" && "border-dashed",
            )}
            style={{ borderColor: `var(--group-${ownership})` }}
          />
          {title}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold tracking-tight text-foreground tabular">
            {stats.smsi === null ? "—" : stats.smsi.toFixed(1)}
          </span>
          {stats.smsi !== null && bandLabel && (
            <SmsiBadge
              band={resolveBand(stats.smsi)}
              label={bandLabel}
              size="sm"
            />
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{countLabel}</p>
        {smallSample && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            {smallSample}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
