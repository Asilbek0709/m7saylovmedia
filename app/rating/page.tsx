import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
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
import { MS7_CRITERIA, resolveBand, SMSI_BANDS } from "@/lib/ms7";
import { getRankings } from "@/lib/rankings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rating");
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default async function RatingPage() {
  // Рейтинг публичен: методика описывает его как инструмент прозрачности.
  // Авторизацией закрыта запись — см. app/actions/evaluations.ts.
  const t = await getTranslations("rating");
  const tc = await getTranslations("criteria");
  const tb = await getTranslations("bands");
  const tCommon = await getTranslations("common");
  const { rows, period, live } = await getRankings(10);

  const average =
    Math.round((rows.reduce((s, r) => s + r.smsi, 0) / rows.length) * 10) / 10;
  const leader = rows[0];

  const kpis = [
    {
      label: t("kpi.outlets"),
      value: String(rows.length),
      note: t("kpi.outletsNote"),
    },
    {
      label: t("kpi.average"),
      value: average.toFixed(1),
      note: tb(`${resolveBand(average).id}.label`),
    },
    {
      label: t("kpi.leader"),
      value: leader.name,
      note: `${leader.smsi.toFixed(1)} ${tCommon("points")}`,
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
            {/* Таблица шире экрана на мобильных — скроллится внутри себя,
                страница по горизонтали не едет. */}
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
                          <span className="block text-sm font-medium text-foreground">
                            {row.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {row.website}
                          </span>
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
                            {row[c.id]}
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
    </div>
  );
}
