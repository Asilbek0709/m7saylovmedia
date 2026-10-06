import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Pencil, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { DeleteEvaluationButton } from "@/components/delete-evaluation-button";
import { SmsiBadge } from "@/components/smsi-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { canWrite, requireUser } from "@/lib/auth";
import {
  getMyEvaluations,
  getRoundSummaries,
  summaryFor,
  type EvaluationRecord,
} from "@/lib/evaluation-records";
import { getLongDateFormatter } from "@/lib/format-date";
import { resolveBand } from "@/lib/ms7";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("my");
  return { title: t("title"), robots: { index: false } };
}

export default async function MyEvaluationsPage() {
  const user = await requireUser("/my");
  const t = await getTranslations("my");
  const tb = await getTranslations("bands");
  const formatDate = await getLongDateFormatter();

  const header = (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
        {t("subtitle")}
      </p>
    </div>
  );

  // Демо-режим или неподтверждённая учётная запись — объясняем, а не пустая таблица.
  const notice = !user ? t("demo") : !canWrite(user) ? t("pending") : null;
  if (notice) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {header}
        <p className="mt-6 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          {notice}
        </p>
      </div>
    );
  }

  const records = await getMyEvaluations(user!);
  const summaries = await getRoundSummaries(records);

  const byPeriod = new Map<string, EvaluationRecord[]>();
  for (const record of records) {
    byPeriod.set(record.period, [...(byPeriod.get(record.period) ?? []), record]);
  }

  const deleteLabels = (record: EvaluationRecord) => ({
    delete: t("delete"),
    title: t("deleteTitle"),
    text: t("deleteText", { outlet: record.outletName, period: record.period }),
    cancel: t("cancel"),
    confirm: t("confirm"),
    deleting: t("deleting"),
    failed: t("deleteFailed"),
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {header}
        {records.length > 0 && (
          <p className="text-sm text-muted-foreground tabular">
            {t("count", { count: records.length })}
          </p>
        )}
      </div>

      {records.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/calculator">{t("emptyCta")}</Link>
          </Button>
        </div>
      ) : (
        [...byPeriod].map(([period, items]) => (
          <Card key={period} className="ms7-surface mt-6 overflow-hidden">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">{period}</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-48 pl-6">
                        {t("columns.outlet")}
                      </TableHead>
                      <TableHead className="w-44">{t("columns.mine")}</TableHead>
                      <TableHead className="w-48">{t("columns.round")}</TableHead>
                      <TableHead className="w-32">{t("columns.date")}</TableHead>
                      <TableHead className="w-64 pr-6 text-right">
                        <span className="sr-only">{t("columns.actions")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
                    {items.map((record) => {
                      const band = resolveBand(record.smsi);
                      const round = summaryFor(summaries, record);
                      const deviation =
                        round && round.experts > 1
                          ? Math.round((record.smsi - round.smsi) * 10) / 10
                          : null;
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="pl-6">
                            <Link
                              href={`/outlets/${record.outletSlug}`}
                              className="block text-sm font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {record.outletName}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {[
                                record.indicators ? t("byIndicators") : null,
                                record.weightSetId !== null
                                  ? t("weights", { id: record.weightSetId })
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground tabular">
                                {record.smsi.toFixed(1)}
                              </span>
                              <SmsiBadge
                                band={band}
                                label={tb(`${band.id}.label`)}
                                size="sm"
                              />
                            </div>
                          </TableCell>

                          <TableCell className="text-sm">
                            {round ? (
                              <>
                                <span className="font-semibold text-foreground tabular">
                                  {round.smsi.toFixed(1)}
                                </span>{" "}
                                <span className="text-xs text-muted-foreground">
                                  · {t("experts", { count: round.experts })}
                                </span>
                                {deviation !== null && (
                                  <span className="block text-xs text-muted-foreground tabular">
                                    {t("deviation", {
                                      value: `${deviation > 0 ? "+" : ""}${deviation.toFixed(1)}`,
                                    })}
                                  </span>
                                )}
                                {round.needsConsensus && (
                                  <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-destructive">
                                    <TriangleAlert aria-hidden className="size-3" />
                                    {t("needsConsensus")}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                            {record.evaluatedAt ? formatDate(record.evaluatedAt) : "—"}
                          </TableCell>

                          <TableCell className="pr-6">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/calculator?edit=${record.id}`}>
                                  <Pencil className="size-3.5" />
                                  {t("edit")}
                                </Link>
                              </Button>
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                              >
                                <Link
                                  href={`/outlets/${record.outletSlug}/report?period=${encodeURIComponent(record.period)}`}
                                >
                                  <FileText className="size-3.5" />
                                  {t("report")}
                                </Link>
                              </Button>
                              <DeleteEvaluationButton
                                id={record.id}
                                labels={deleteLabels(record)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
