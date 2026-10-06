import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PrintButton } from "@/components/report-print";
import { ReportRadar } from "@/components/report-radar";
import { SmsiBadge } from "@/components/smsi-badge";
import { Button } from "@/components/ui/button";
import { getLongDateFormatter } from "@/lib/format-date";
import { formatScore, MS7_CRITERIA, resolveBand, SMSI_BANDS } from "@/lib/ms7";
import { getOutletHistory, type OutletHistory } from "@/lib/rankings";
import { buildRecommendations } from "@/lib/recommendations";
import { BUILTIN_WEIGHT_SET, getWeightHistory } from "@/lib/weights";

type Params = { params: Promise<{ slug: string }> };
type SearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Самые выгодные мезоны для улучшения — столько попадает в протокол. */
const TOP_PRIORITIES = 3;
/** Длиннее путь к следующему уровню расписывать по шагам незачем. */
const MAX_PATH_STEPS = 3;

/**
 * Номер протокола: идентификатор издания в базе и дата оценки. По нему
 * бумажный документ находится в базе: издание + тур однозначны.
 */
function protocolNumber(history: OutletHistory, evaluatedAt: string) {
  const outlet = history.id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase();
  const date = evaluatedAt ? evaluatedAt.replaceAll("-", "") : "DEMO";
  return `MS7-${outlet}-${date}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const history = await getOutletHistory(slug);
  const t = await getTranslations("report");
  return {
    title: history ? `${t("title")} — ${history.name}` : t("title"),
    robots: { index: false },
  };
}

export default async function ReportPage({
  params,
  searchParams,
}: Params & SearchParams) {
  const { slug } = await params;
  const history = await getOutletHistory(slug);
  if (!history || history.points.length === 0) notFound();

  const t = await getTranslations("report");
  const tc = await getTranslations("criteria");
  const tb = await getTranslations("bands");
  const tr = await getTranslations("rating");
  const to = await getTranslations("outlet");
  const tRec = await getTranslations("recommendations");
  const tCommon = await getTranslations("common");
  const formatDate = await getLongDateFormatter();

  // По умолчанию — последний тур; ?period=… печатает прошлый.
  const requested = (await searchParams).period;
  const period = Array.isArray(requested) ? requested[0] : requested;
  const points = history.points;
  const byPeriod = period ? points.find((p) => p.period === period) : null;
  const point = byPeriod ?? points[points.length - 1];

  const weightHistory = await getWeightHistory();
  const weightSet =
    weightHistory.sets.find((s) => s.id === point.weightSetId) ??
    (point.weightSetId === null ? BUILTIN_WEIGHT_SET : weightHistory.active);

  const band = resolveBand(point.smsi);
  const consensus = point.consensus;
  const experts = consensus?.experts ?? null;
  const number = protocolNumber(history, point.evaluatedAt);

  const rows = MS7_CRITERIA.map((c) => {
    const weight = weightSet.weights[c.id];
    return {
      id: c.id,
      name: tc(`${c.id}.name`),
      code: tc(`${c.id}.code`),
      score: point[c.id],
      weight,
      contribution: point[c.id] * weight,
    };
  });

  const plan = buildRecommendations(point, { smsi: point.smsi });
  const nextBand = SMSI_BANDS.find((b) => b.id === plan.nextBand);

  const meta = [
    { label: t("meta.outlet"), value: history.name },
    { label: t("meta.website"), value: history.website ?? "—" },
    {
      label: t("meta.ownership"),
      value: tr(`ownership.${history.ownership}`),
    },
    { label: t("meta.region"), value: history.region || "—" },
    { label: t("meta.period"), value: point.period },
    {
      label: t("meta.evaluatedAt"),
      value: point.evaluatedAt
        ? formatDate(point.evaluatedAt)
        : t("noDate"),
    },
    { label: t("meta.experts"), value: experts === null ? "—" : String(experts) },
    { label: t("meta.weights"), value: `v${weightSet.id}` },
  ];

  const sectionTitle =
    "text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

  return (
    <div className="mx-auto w-full max-w-[210mm] px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href={`/outlets/${history.slug}`}>
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
        <PrintButton label={t("print")} />
        <p className="w-full text-xs text-muted-foreground">{t("hint")}</p>
        {period && !byPeriod && (
          <p className="w-full text-xs text-destructive">
            {t("periodMissing", { period })}
          </p>
        )}
      </div>

      <article className="rounded-lg border border-border bg-card p-6 text-[13px] leading-relaxed text-card-foreground shadow-sm sm:p-10 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        {/* Шапка */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-4">
          <div className="min-w-0">
            <p className={sectionTitle}>
              {tCommon("brand")} · {tCommon("tagline")}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {t("title")}
            </h1>
          </div>
          <p className="shrink-0 text-right text-sm font-semibold text-foreground tabular">
            {t("number", { number })}
          </p>
        </header>

        {!history.live && (
          <p className="mt-3 rounded border border-border px-3 py-2 text-xs text-muted-foreground">
            {t("demo")}
          </p>
        )}

        <dl className="mt-4 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 print:grid-cols-2">
          {meta.map((item) => (
            <div key={item.label} className="flex min-w-0 gap-2">
              <dt className="shrink-0 text-muted-foreground">{item.label}:</dt>
              <dd className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Результат */}
        <section className="mt-6 grid items-center gap-6 break-inside-avoid sm:grid-cols-[minmax(0,1fr)_260px] print:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <h2 className={sectionTitle}>{t("result")}</h2>
            <p className="mt-2 text-muted-foreground">{t("index")}</p>
            <p className="text-4xl leading-tight font-semibold tracking-tight text-foreground tabular">
              {point.smsi.toFixed(1)}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                / 100
              </span>
            </p>
            {/* Уровень написан словами: протокол должен читаться в ч/б печати. */}
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{t("level")}:</span>
              <SmsiBadge band={band} label={tb(`${band.id}.label`)} size="sm" />
              <span className="text-muted-foreground tabular">
                ({band.min}–{band.max})
              </span>
            </p>
            <p className="mt-2 text-foreground">
              {tb(`${band.id}.interpretation`)}
            </p>
          </div>
          <figure className="min-w-0">
            <ReportRadar
              color={band.color}
              data={rows.map((row) => ({ axis: row.code, value: row.score }))}
            />
            <figcaption className="text-center text-xs text-muted-foreground">
              {t("profile")}
            </figcaption>
          </figure>
        </section>

        {/* Мезоны */}
        <section className="mt-6 break-inside-avoid">
          <h2 className={sectionTitle}>{t("breakdown")}</h2>
          <table className="mt-2 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-foreground/60 text-xs text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">
                  {t("columns.criterion")}
                </th>
                <th className="w-20 py-1.5 text-right font-medium">
                  {t("columns.score")}
                </th>
                <th className="w-20 py-1.5 text-right font-medium">
                  {t("columns.weight")}
                </th>
                <th className="w-28 py-1.5 text-right font-medium">
                  {t("columns.contribution")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border">
                  <td className="py-1.5 pr-2 text-foreground">
                    <span className="mr-2 inline-block w-7 text-xs text-muted-foreground">
                      {row.code}
                    </span>
                    {row.name}
                  </td>
                  <td className="py-1.5 text-right text-foreground tabular">
                    {formatScore(row.score)}
                  </td>
                  <td className="py-1.5 text-right text-muted-foreground tabular">
                    {row.weight.toFixed(2)}
                  </td>
                  <td className="py-1.5 text-right text-foreground tabular">
                    {row.contribution.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground/60 font-semibold">
                <td className="py-1.5 pr-2 text-foreground">{t("total")}</td>
                <td />
                <td className="py-1.5 text-right text-muted-foreground tabular">
                  {rows.reduce((s, r) => s + r.weight, 0).toFixed(2)}
                </td>
                <td className="py-1.5 text-right text-foreground tabular">
                  {point.smsi.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("contributionNote")}
          </p>
        </section>

        {/* Согласованность — только если тур оценивали несколько экспертов */}
        {consensus && consensus.experts > 1 && (
          <section className="mt-5 break-inside-avoid">
            <h2 className={sectionTitle}>{t("consensus")}</h2>
            <p className="mt-1.5 text-foreground">
              {consensus.needsConsensus && (
                <strong className="font-semibold">
                  {to("consensus.flag")}.{" "}
                </strong>
              )}
              {consensus.needsConsensus
                ? to("consensus.flagText")
                : to("consensus.ok")}{" "}
              {t("consensusLine", {
                sd: consensus.smsiSd === null ? "—" : consensus.smsiSd.toFixed(1),
                range: consensus.smsiRange.toFixed(1),
              })}
            </p>
          </section>
        )}

        {/* Рекомендации */}
        <section className="mt-5 break-inside-avoid">
          <h2 className={sectionTitle}>{t("recommendations")}</h2>
          <p className="mt-1.5 text-foreground">
            {nextBand
              ? tRec("gap", {
                  band: tb(`${nextBand.id}.label`),
                  gap: plan.gap.toFixed(1),
                  from: plan.smsi.toFixed(1),
                  to: plan.target ?? 0,
                })
              : tRec("top")}
          </p>

          {nextBand && plan.steps.length > 0 && (
            <>
              <p className="mt-2 text-muted-foreground">{t("path")}</p>
              {plan.steps.length <= MAX_PATH_STEPS ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground">
                  {plan.steps.map((step) => (
                    <li key={step.criterion}>
                      {tc(`${step.criterion}.name`)}:{" "}
                      <span className="tabular">
                        {formatScore(step.from)} → {step.to} (+
                        {step.gain.toFixed(1)})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-foreground">
                  {tRec("pathBroad", {
                    count: plan.steps.length,
                    target: plan.target ?? 0,
                  })}
                </p>
              )}
            </>
          )}

          {plan.priorities.length > 0 && (
            <>
              <p className="mt-2 text-muted-foreground">{t("priorities")}</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-foreground">
                {plan.priorities.slice(0, TOP_PRIORITIES).map((p) => (
                  <li key={p.criterion}>
                    {tc(`${p.criterion}.name`)} —{" "}
                    <span className="tabular">{formatScore(p.score)}</span>;{" "}
                    {tRec("potential", { value: p.potential.toFixed(1) })}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        {/* Подписи: по строке на каждого эксперта тура */}
        <section className="mt-8 break-inside-avoid">
          <h2 className={sectionTitle}>{t("signatures")}</h2>
          <div className="mt-4 space-y-5">
            {Array.from({ length: Math.max(1, experts ?? 1) }, (_, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,9rem)] items-end gap-x-4"
              >
                <span className="text-muted-foreground">
                  {t("signature")} {(experts ?? 1) > 1 ? i + 1 : ""}
                </span>
                <span className="border-b border-foreground/70 pb-0.5 text-center text-[10px] text-muted-foreground">
                  &nbsp;
                </span>
                <span className="border-b border-foreground/70 pb-0.5 text-center text-[10px] text-muted-foreground">
                  &nbsp;
                </span>
                <span />
                <span className="text-center text-[10px] text-muted-foreground">
                  {t("nameHint")}
                </span>
                <span className="text-center text-[10px] text-muted-foreground">
                  {t("signHint")}
                </span>
              </div>
            ))}
            <p className="text-muted-foreground">
              {t("date")}: ____________________
            </p>
          </div>
        </section>

        <footer className="mt-8 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
          <p>
            {t("meta.generated")}: {formatDate(new Date())} · {t("number", { number })}
          </p>
          <p className="mt-0.5">{t("footer")}</p>
        </footer>
      </article>
    </div>
  );
}
