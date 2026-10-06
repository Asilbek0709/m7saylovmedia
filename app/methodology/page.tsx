import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { SmsiBadge } from "@/components/smsi-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canWrite, getCurrentUser } from "@/lib/auth";
import { getLongDateFormatter } from "@/lib/format-date";
import { MS7_CRITERIA, SMSI_BANDS, WEIGHTS_VERSION } from "@/lib/ms7";
import { cn } from "@/lib/utils";
import { getWeightHistory } from "@/lib/weights";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("methodology");
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default async function MethodologyPage() {
  const t = await getTranslations("methodology");
  const tc = await getTranslations("criteria");
  const tb = await getTranslations("bands");
  const formatDate = await getLongDateFormatter();
  const [weightHistory, user] = await Promise.all([
    getWeightHistory(),
    getCurrentUser(),
  ]);

  // Веса на странице — из действующего набора базы, а не из кода.
  const { active } = weightHistory;
  const totalWeight = MS7_CRITERIA.reduce(
    (s, c) => s + active.weights[c.id],
    0,
  );
  // Расхождение — сигнал для тех, кто ведёт оценки; публике он ни к чему.
  const showMismatch =
    canWrite(user) &&
    (weightHistory.mismatch.length > 0 || weightHistory.versionMismatch);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Reveal>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
      </Reveal>


      <Reveal delay={0.06}>
        <Card className="ms7-surface mt-6">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">{t("algorithmTitle")}</CardTitle>
            <CardDescription>{t("algorithmSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
              SMSI = Σ (M<sub>i</sub> × W<sub>i</sub>), i = 1…7 ·{" "}
              <span className="tabular">Σ W = {totalWeight.toFixed(2)}</span>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {t("formulaNote")}
            </p>
          </CardContent>
        </Card>
      </Reveal>


      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {MS7_CRITERIA.map((criterion, i) => {
          const indicators = tc.raw(
            `${criterion.id}.indicators`,
          ) as unknown as string[];
          const name = tc(`${criterion.id}.name`);
          const latin = tc(`${criterion.id}.latin`);

          const showLatin = latin.toLowerCase() !== name.toLowerCase();

          return (
            <Reveal key={criterion.id} delay={0.05 * i}>
              <Card className="ms7-surface h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        {i + 1}. {name}
                      </CardTitle>
                      {showLatin && <CardDescription>{latin}</CardDescription>}
                    </div>
                    <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground tabular">
                      {active.weights[criterion.id].toFixed(2)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {tc(`${criterion.id}.description`)}
                  </p>
                  <Separator className="my-3" />
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("indicators")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {indicators.map((indicator) => (
                      <li
                        key={indicator}
                        className="flex gap-2 text-xs text-foreground"
                      >
                        <span aria-hidden className="text-muted-foreground">
                          —
                        </span>
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.1}>
        <Card className="ms7-surface mt-6 overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">{t("weights.title")}</CardTitle>
            <CardDescription>{t("weights.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-5">
            <div className="px-6">
              {showMismatch && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs leading-relaxed text-foreground"
                >
                  <TriangleAlert
                    aria-hidden
                    className="mt-px size-3.5 shrink-0 text-destructive"
                  />
                  <span>
                    <strong className="font-semibold">
                      {t("weights.mismatchTitle")}
                    </strong>{" "}
                    {t("weights.mismatch", {
                      ui: WEIGHTS_VERSION,
                      db: active.id,
                    })}
                  </span>
                </div>
              )}
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("weights.active")}
              </p>
              <p className="mt-1 text-sm text-foreground">
                <span className="font-semibold">
                  {t("weights.version", { id: active.id })}
                </span>
                {active.validFrom && (
                  <span className="text-muted-foreground">
                    {" · "}
                    {t("weights.validFrom", {
                      date: formatDate(active.validFrom),
                    })}
                  </span>
                )}
              </p>
              {!weightHistory.live && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("weights.builtin")}
                </p>
              )}
              <p className="mt-5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("weights.history")}
              </p>
            </div>

            <div className="mt-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">
                      {t("weights.versionCol")}
                    </TableHead>
                    <TableHead>{t("weights.validFromCol")}</TableHead>
                    {MS7_CRITERIA.map((c) => (
                      <TableHead
                        key={c.id}
                        title={tc(`${c.id}.name`)}
                        className="text-center"
                      >
                        {tc(`${c.id}.code`)}
                      </TableHead>
                    ))}
                    <TableHead className="min-w-40 pr-6">
                      {t("weights.noteCol")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...weightHistory.sets].reverse().map((set) => {
                    const current = set.id === active.id;
                    return (
                      <TableRow
                        key={set.id}
                        className={cn(current && "bg-muted/40")}
                      >
                        <TableCell className="pl-6 text-sm whitespace-nowrap">
                          <span className="font-semibold tabular">
                            v{set.id}
                          </span>
                          {current && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {t("weights.current")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          {set.validFrom ? formatDate(set.validFrom) : "—"}
                        </TableCell>
                        {MS7_CRITERIA.map((c) => (
                          <TableCell
                            key={c.id}
                            className="text-center text-sm tabular"
                          >
                            {set.weights[c.id].toFixed(2)}
                          </TableCell>
                        ))}
                        <TableCell className="pr-6 text-xs text-muted-foreground">
                          {set.note ?? "—"}
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

      <Reveal delay={0.2}>
        <Card className="ms7-surface mt-6">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">{t("scaleTitle")}</CardTitle>
            <CardDescription>{t("scaleSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <ul className="grid gap-2.5">
              {SMSI_BANDS.map((band) => (
                <li
                  key={band.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-border px-3.5 py-2.5"
                >
                  <span className="w-20 shrink-0 text-sm font-semibold text-foreground tabular">
                    {band.min}–{band.max}
                  </span>
                  <SmsiBadge
                    band={band}
                    label={tb(`${band.id}.label`)}
                    size="sm"
                    className="min-w-0"
                  />
                  <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                    {tb(`${band.id}.interpretation`)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
