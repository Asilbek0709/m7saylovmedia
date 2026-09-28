"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2, RotateCcw, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";

import { Reveal } from "@/components/motion/reveal";
import { Recommendations } from "@/components/recommendations";
import { SmsiBadge } from "@/components/smsi-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveEvaluation } from "@/app/actions/evaluations";
import { type RankingRow } from "@/lib/demo-data";
import { buildRecommendations } from "@/lib/recommendations";
import {
  calculateSMSI,
  criterionFromIndicators,
  DEFAULT_SCORES,
  indicatorsFromScores,
  MS7_CRITERIA,
  resolveBand,
  SCORE_MAX,
  SCORE_MIN,
  SMSI_BANDS,
  strongestCriterion,
  weakestCriterion,
  type CriteriaScores,
  type CriterionId,
  type IndicatorScores,
} from "@/lib/ms7";

/* ------------------------------------------------------------------ */
/*  Данные                                                             */
/* ------------------------------------------------------------------ */

/** Только семь оценок — без служебных полей издания. */
function scoresOf(row: RankingRow): CriteriaScores {
  return Object.fromEntries(
    MS7_CRITERIA.map((c) => [c.id, row[c.id]]),
  ) as CriteriaScores;
}

export interface Outlet extends RankingRow {
  scores: CriteriaScores;
  smsi: number;
}

/** Каталог для поиска: издания с посчитанным индексом, по убыванию. */
function buildCatalog(rows: RankingRow[]): Outlet[] {
  return rows
    .map((row) => ({ ...row, scores: scoresOf(row), smsi: calculateSMSI(scoresOf(row)) }))
    .sort((a, b) => b.smsi - a.smsi);
}

/** Средние баллы по каталогу — контрольная линия «среднее по отрасли». */
function sectorAverageOf(outlets: Outlet[]): CriteriaScores {
  if (outlets.length === 0) {
    return Object.fromEntries(
      MS7_CRITERIA.map((c) => [c.id, 0]),
    ) as CriteriaScores;
  }

  return Object.fromEntries(
    MS7_CRITERIA.map((c) => [
      c.id,
      Math.round(
        (outlets.reduce((s, o) => s + o.scores[c.id], 0) / outlets.length) * 10,
      ) / 10,
    ]),
  ) as CriteriaScores;
}

const PRESETS: { key: "high" | "mid" | "crisis"; scores: CriteriaScores }[] = [
  {
    key: "high",
    scores: {
      legal: 94,
      quality: 92,
      speed: 95,
      multimedia: 90,
      interactivity: 88,
      engagement: 96,
      convergence: 93,
    },
  },
  {
    key: "mid",
    scores: {
      legal: 74,
      quality: 70,
      speed: 66,
      multimedia: 63,
      interactivity: 58,
      engagement: 61,
      convergence: 65,
    },
  },
  {
    key: "crisis",
    scores: {
      legal: 42,
      quality: 38,
      speed: 45,
      multimedia: 33,
      interactivity: 29,
      engagement: 35,
      convergence: 31,
    },
  },
];

/**
 * Полоса шкалы 0–100. Ширина сегмента = ширина диапазона уровня, поэтому
 * маркер `left: smsi%` попадает ровно в свой цвет.
 */
const SCALE_SEGMENTS = [...SMSI_BANDS]
  .reverse() // от «Инқирозли» слева к «Жуда юқори» справа
  .map((band, i, ascending) => {
    const upperBound =
      i === ascending.length - 1 ? SCORE_MAX : ascending[i + 1].min;
    return { band, width: upperBound - band.min };
  });

interface ChartDatum {
  id: CriterionId;
  axis: string;
  name: string;
  weight: number;
  value: number;
  benchmark: number;
  baseline: number | null;
}

/* ------------------------------------------------------------------ */
/*  Плавный переход баллов                                             */
/* ------------------------------------------------------------------ */

/**
 * Recharts 3 перестала доигрывать собственную анимацию Radar при частой
 * смене данных — полигон оставался схлопнутым в центр. Поэтому анимация
 * диаграммы выключена, а плавность даёт интерполяция самих баллов:
 * разъезжаются и ползунки, и фигура сразу.
 */
function useAnimatedScores(initial: CriteriaScores) {
  const [scores, setScores] = React.useState(initial);
  const scoresRef = React.useRef(scores);
  const frameRef = React.useRef<number | null>(null);
  const fallbackRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  const stop = React.useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (fallbackRef.current !== null) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
  }, []);

  React.useEffect(() => stop, [stop]);

  /** Мгновенно — для ползунков и полей ввода. */
  const setOne = React.useCallback(
    (id: CriterionId, value: number) => {
      stop();
      setScores((prev) => ({
        ...prev,
        [id]: Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value))),
      }));
    },
    [stop],
  );

  /** С переходом — для пресетов и подстановки оценок издания. */
  const animateTo = React.useCallback(
    (target: CriteriaScores) => {
      stop();

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced) {
        setScores(target);
        return;
      }

      const from = scoresRef.current;
      const started = performance.now();
      const duration = 520;

      const step = (now: number) => {
        const t = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - t, 3);

        setScores(
          Object.fromEntries(
            MS7_CRITERIA.map((c) => [
              c.id,
              Math.round(from[c.id] + (target[c.id] - from[c.id]) * eased),
            ]),
          ) as CriteriaScores,
        );

        frameRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };

      frameRef.current = requestAnimationFrame(step);

      // Страховка: в фоновой вкладке rAF приостанавливается, и переход
      // застыл бы на стартовых баллах. Таймеры продолжают срабатывать.
      fallbackRef.current = setTimeout(() => {
        stop();
        setScores(target);
      }, duration + 120);
    },
    [stop],
  );

  return { scores, setOne, animateTo };
}

/* ------------------------------------------------------------------ */
/*  Подсказка диаграммы                                                */
/* ------------------------------------------------------------------ */

function RadarTooltip({ active, payload }: TooltipContentProps) {
  const t = useTranslations("calculator.chart");
  const ts = useTranslations("calculator.selected");

  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as ChartDatum | undefined;
  if (!datum) return null;

  const round = (n: number) => Math.round(n * 10) / 10;
  const signed = (n: number) => (n > 0 ? `+${round(n)}` : `${round(n)}`);

  return (
    <div className="min-w-56 rounded-md border border-border bg-popover p-3 shadow-md">
      <p className="text-sm font-semibold text-popover-foreground">
        {datum.name}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {t("weight")} {datum.weight.toFixed(2)}
      </p>
      <Separator className="my-2" />
      <dl className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t("score")}</dt>
          <dd className="font-semibold text-popover-foreground tabular">
            {datum.value}
          </dd>
        </div>
        {datum.baseline !== null && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{ts("baseline")}</dt>
            <dd className="text-popover-foreground tabular">
              {datum.baseline}{" "}
              <span className="text-muted-foreground">
                ({signed(datum.value - datum.baseline)})
              </span>
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t("benchmark")}</dt>
          <dd className="text-popover-foreground tabular">{datum.benchmark}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t("difference")}</dt>
          <dd className="font-medium text-popover-foreground tabular">
            {signed(datum.value - datum.benchmark)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Страница                                                           */
/* ------------------------------------------------------------------ */

export interface CalculatorPanelProps {
  /** Каталог для поиска: из Supabase, а в демо-режиме — из lib/demo-data.ts. */
  rows: RankingRow[];
  /** Сохранение доступно только подтверждённому эксперту. */
  canSave: boolean;
  /** Почему сохранение недоступно — показывается вместо формы. */
  saveHint: "demo" | "signin" | "pending" | null;
  defaultPeriod: string;
}

export function CalculatorPanel({
  rows,
  canSave,
  saveHint,
  defaultPeriod,
}: CalculatorPanelProps) {
  const t = useTranslations("calculator");
  const tc = useTranslations("criteria");
  const tb = useTranslations("bands");
  const tCommon = useTranslations("common");

  const outlets = React.useMemo(() => buildCatalog(rows), [rows]);
  const sectorAverage = React.useMemo(
    () => sectorAverageOf(outlets),
    [outlets],
  );

  const { scores, setOne, animateTo } = useAnimatedScores(DEFAULT_SCORES);
  const [weighted, setWeighted] = React.useState(true);

  const indicatorNames = React.useMemo(
    () =>
      Object.fromEntries(
        MS7_CRITERIA.map((c) => [
          c.id,
          tc.raw(`${c.id}.indicators`) as unknown as string[],
        ]),
      ) as Record<CriterionId, string[]>,
    [tc],
  );
  const [mode, setMode] = React.useState<"direct" | "indicators">("direct");
  const [indicators, setIndicators] = React.useState<IndicatorScores | null>(
    null,
  );

  const switchMode = (next: "direct" | "indicators") => {
    setMode(next);
    setIndicators(
      next === "indicators"
        ? indicatorsFromScores(
            scores,
            Object.fromEntries(
              MS7_CRITERIA.map((c) => [c.id, indicatorNames[c.id].length]),
            ) as Record<CriterionId, number>,
          )
        : null,
    );
  };

  const setIndicator = (id: CriterionId, index: number, value: number) => {
    if (!indicators) return;
    const clamped = Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value)));
    const list = indicators[id].map((v, i) => (i === index ? clamped : v));
    setIndicators({ ...indicators, [id]: list });
    setOne(id, criterionFromIndicators(list));
  };
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Outlet | null>(null);

  const [outletName, setOutletName] = React.useState("");
  const [period, setPeriod] = React.useState(defaultPeriod);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<{
    outletName: string;
    smsi: number;
  } | null>(null);

  // ⌘K / Ctrl+K — как в Spotlight.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const smsi = calculateSMSI(scores, weighted);
  const band = resolveBand(smsi);
  const strongest = strongestCriterion(scores);
  const weakest = weakestCriterion(scores);
  const plan = buildRecommendations(scores, {
    weighted,
    indicators: mode === "indicators" ? indicators : null,
  });

  const baseline = selected?.scores ?? null;
  const baselineSmsi = baseline ? calculateSMSI(baseline, weighted) : null;
  const modified =
    baseline !== null &&
    MS7_CRITERIA.some((c) => scores[c.id] !== baseline[c.id]);

  const chartData: ChartDatum[] = MS7_CRITERIA.map((criterion) => ({
    id: criterion.id,
    axis: tc(`${criterion.id}.short`),
    name: tc(`${criterion.id}.name`),
    weight: criterion.weight,
    value: scores[criterion.id],
    benchmark: sectorAverage[criterion.id],
    baseline: baseline ? baseline[criterion.id] : null,
  }));

  const pickOutlet = (outlet: Outlet) => {
    setSelected(outlet);
    setSearchOpen(false);
    setOutletName(outlet.name);
    setSaved(null);
    setSaveError(null);
    setMode("direct");
    setIndicators(null);
    animateTo(outlet.scores);
  };

  const submitSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(null);

    const result = await saveEvaluation({
      // Из демо-набора приходит slug, а не UUID — действие это распознаёт.
      outletId: selected?.outlet_id ?? null,
      outletName,
      period,
      scores,
      indicators: mode === "indicators" ? indicators : null,
    });

    setSaving(false);
    if (result.ok) {
      setSaved({ outletName: result.outletName, smsi: result.smsi });
    } else {
      setSaveError(t(`save.${result.reason}`));
    }
  };

  const applyPreset = (next: CriteriaScores) => {
    // Пресет перекрывает профиль издания — иначе «базовая оценка» перестаёт
    // соответствовать выбранному СМИ и дельта теряет смысл.
    setSelected(null);
    setMode("direct");
    setIndicators(null);
    animateTo(next);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* -------------------------------- заголовок -------------------------------- */}
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Tabs
          value={weighted ? "weighted" : "equal"}
          onValueChange={(v) => setWeighted(v === "weighted")}
        >
          <TabsList>
            <TabsTrigger value="weighted">{t("weightedMode")}</TabsTrigger>
            <TabsTrigger value="equal">{t("equalMode")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </Reveal>

      {/* ------------------------------ умный поиск ------------------------------ */}
      <Reveal delay={0.05}>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="ms7-surface mt-6 flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-ring/40"
        >
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm text-muted-foreground">
            {t("search.trigger")}
          </span>
          <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </Reveal>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title={t("search.placeholder")}
        description={t("search.hint")}
      >
        {/*
          CommandDialog из shadcn отдаёт только Dialog + DialogContent и НЕ
          оборачивает содержимое в cmdk-root. Без явного <Command> дочерние
          CommandInput/CommandList падают с "reading 'subscribe'".
        */}
        <Command>
          <CommandInput placeholder={t("search.placeholder")} />
          <CommandList>
            <CommandEmpty>{t("search.empty")}</CommandEmpty>
            <CommandGroup heading={t("search.group")}>
              {outlets.map((outlet) => {
                const outletBand = resolveBand(outlet.smsi);
                return (
                  <CommandItem
                    key={outlet.outlet_id}
                    value={`${outlet.name} ${outlet.website}`}
                    onSelect={() => pickOutlet(outlet)}
                    className="gap-3"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: outletBand.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {outlet.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {outlet.website}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular">
                        {outlet.smsi.toFixed(1)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {tb(`${outletBand.id}.label`)}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* ------------------------- ЛЕВО: ввод баллов ------------------------- */}
        <Reveal delay={0.1} className="min-w-0 lg:col-span-5">
          <Card className="ms7-surface h-full">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">{t("scoresTitle")}</CardTitle>
              <CardDescription>{t("scoresSubtitle")}</CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              {/* Выбранное издание + режим «А что если?» */}
              {selected && (
                <div className="mb-5 rounded-md border border-border bg-muted/50 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        {t("selected.label")}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                        {selected.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("selected.clear")}
                      onClick={() => setSelected(null)}
                      className="-mt-1 -mr-1 size-7 shrink-0 text-muted-foreground"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">
                      {t("selected.baseline")}:{" "}
                      <span className="font-semibold text-foreground tabular">
                        {baselineSmsi?.toFixed(1)}
                      </span>
                    </span>
                    {modified && baselineSmsi !== null && (
                      <span className="text-muted-foreground">
                        {t("selected.delta")}:{" "}
                        <span className="font-semibold text-foreground tabular">
                          {smsi - baselineSmsi > 0 ? "+" : ""}
                          {(Math.round((smsi - baselineSmsi) * 10) / 10).toFixed(
                            1,
                          )}
                        </span>
                      </span>
                    )}
                  </div>

                  {modified && baseline && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {t("selected.whatIf")}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => animateTo(baseline)}
                        className="mt-2.5 h-7 gap-1.5 text-xs"
                      >
                        <RotateCcw className="size-3" />
                        {t("selected.restore")}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset.scores)}
                  >
                    {t(`presets.${preset.key}`)}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyPreset(DEFAULT_SCORES)}
                >
                  {t("presets.reset")}
                </Button>
              </div>

              <Separator className="my-5" />

              <Tabs
                value={mode}
                onValueChange={(v) => switchMode(v as "direct" | "indicators")}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="direct" className="flex-1">
                    {t("mode.direct")}
                  </TabsTrigger>
                  <TabsTrigger value="indicators" className="flex-1">
                    {t("mode.indicators")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="mt-2 mb-5 text-[11px] leading-relaxed text-muted-foreground">
                {mode === "indicators" ? t("mode.indicatorsHint") : t("mode.directHint")}
              </p>

              <div className="space-y-6">
                {MS7_CRITERIA.map((criterion, index) => {
                  const value = scores[criterion.id];
                  const base = baseline?.[criterion.id];
                  const changed = base !== undefined && base !== value;
                  const name = tc(`${criterion.id}.name`);
                  const latin = tc(`${criterion.id}.latin`);
                  // В английской локали подпись совпадает с названием —
                  // дублировать её незачем.
                  const showLatin = latin.toLowerCase() !== name.toLowerCase();

                  return (
                    <div key={criterion.id} className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <span
                            aria-hidden
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-secondary text-[10px] font-semibold text-secondary-foreground tabular"
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {showLatin && `${latin} · `}
                              <span className="tabular">
                                {criterion.weight.toFixed(2)}
                              </span>
                              {changed && (
                                <>
                                  {" · "}
                                  <span className="tabular">
                                    {base} → {value}
                                  </span>
                                </>
                              )}
                            </span>
                          </span>
                        </div>

                        <Input
                          type="number"
                          min={SCORE_MIN}
                          max={SCORE_MAX}
                          value={value}
                          aria-label={name}
                          disabled={mode === "indicators"}
                          onChange={(e) =>
                            setOne(criterion.id, Number(e.target.value))
                          }
                          className="h-8 w-16 shrink-0 text-right text-sm tabular"
                        />
                      </div>

                      {mode === "indicators" && indicators ? (
                        <div className="space-y-3 rounded-md border border-border bg-muted/30 px-3 py-3">
                          {indicatorNames[criterion.id].map((label, i) => (
                            <div key={label} className="space-y-1.5">
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="min-w-0 text-xs leading-snug text-muted-foreground">
                                  {label}
                                </span>
                                <span className="shrink-0 text-xs font-semibold text-foreground tabular">
                                  {indicators[criterion.id][i]}
                                </span>
                              </div>
                              <Slider
                                value={[indicators[criterion.id][i]]}
                                min={SCORE_MIN}
                                max={SCORE_MAX}
                                step={1}
                                aria-label={`${name}: ${label}`}
                                onValueChange={([next]) =>
                                  setIndicator(criterion.id, i, next)
                                }
                              />
                            </div>
                          ))}
                          <p className="border-t border-border pt-2 text-[11px] text-muted-foreground tabular">
                            {t("mode.average")}: {value}
                          </p>
                        </div>
                      ) : (
                        <Slider
                          value={[value]}
                          min={SCORE_MIN}
                          max={SCORE_MAX}
                          step={1}
                          aria-label={name}
                          onValueChange={([next]) => setOne(criterion.id, next)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ------------------- сохранение оценки ------------------- */}
              <Separator className="my-6" />

              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("save.title")}
              </p>

              {canSave ? (
                <form onSubmit={submitSave} className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="save-outlet" className="text-xs">
                      {t("save.outlet")}
                    </Label>
                    <Input
                      id="save-outlet"
                      value={outletName}
                      disabled={saving}
                      placeholder={t("save.outletPlaceholder")}
                      onChange={(e) => setOutletName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="save-period" className="text-xs">
                      {t("save.period")}
                    </Label>
                    <Input
                      id="save-period"
                      value={period}
                      disabled={saving}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  {saveError && (
                    <p role="alert" className="text-xs text-destructive">
                      {saveError}
                    </p>
                  )}

                  {saved && (
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Check aria-hidden className="size-3.5" />
                      {t("save.success")} · {saved.outletName}{" "}
                      <span className="tabular">{saved.smsi.toFixed(1)}</span>
                      <Link
                        href="/rating"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        {t("save.viewRating")}
                      </Link>
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="w-full"
                  >
                    {saving && <Loader2 className="size-3.5 animate-spin" />}
                    {saving ? t("save.submitting") : t("save.submit")}
                  </Button>
                </form>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {saveHint === "signin" && (
                    <>
                      {t("save.signin")}{" "}
                      <Link
                        href="/login?next=%2Fcalculator"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        {t("save.signinCta")}
                      </Link>
                    </>
                  )}
                  {saveHint === "pending" && t("save.pending")}
                  {saveHint === "demo" && t("save.demo")}
                </p>
              )}
            </CardContent>
          </Card>
        </Reveal>

        {/* --------------------- ПРАВО: индекс + диаграмма --------------------- */}
        <Reveal delay={0.16} className="min-w-0 lg:col-span-7">
          <Card className="ms7-surface h-full">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">{t("indexTitle")}</CardTitle>
              <CardDescription>
                {weighted
                  ? t("indexSubtitleWeighted")
                  : t("indexSubtitleEqual")}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {/* ----- крупный балл ----- */}
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="flex items-end gap-2">
                  <span
                    className="text-[64px] leading-none font-semibold tracking-tight transition-colors duration-500"
                    style={{ color: band.color }}
                  >
                    {smsi.toFixed(1)}
                  </span>
                  <span className="pb-2 text-lg font-medium text-muted-foreground">
                    {tCommon("of100")}
                  </span>
                </div>
                <div className="pb-1">
                  <SmsiBadge band={band} label={tb(`${band.id}.label`)} />
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                    {tb(`${band.id}.interpretation`)}
                  </p>
                </div>
              </div>

              {/* ----- шкала интерпретации ----- */}
              <div className="mt-6">
                <div className="relative">
                  <div className="flex h-2 overflow-hidden rounded-full">
                    {SCALE_SEGMENTS.map((segment) => (
                      <div
                        key={segment.band.id}
                        title={`${segment.band.min}–${segment.band.max}`}
                        style={{
                          width: `${segment.width}%`,
                          backgroundColor: segment.band.color,
                          opacity: segment.band.id === band.id ? 1 : 0.28,
                        }}
                        className="transition-opacity duration-500"
                      />
                    ))}
                  </div>
                  <div
                    className="absolute -top-1 h-4 w-[3px] rounded-full bg-foreground transition-[left] duration-500 ease-out"
                    style={{ left: `calc(${smsi}% - 1.5px)` }}
                    aria-hidden
                  />
                </div>
                {/*
                  Подписи стоят на своей реальной доле шкалы: раскладка
                  justify-between распределила бы их равномерно, и «90»
                  встало бы на отметку 80% — ось врала бы о положении.
                */}
                <div className="relative mt-2 h-4 text-[10px] text-muted-foreground tabular">
                  {[0, 45, 60, 75, 90, 100].map((tick) => (
                    <span
                      key={tick}
                      className="absolute top-0"
                      style={{
                        left: `${tick}%`,
                        transform:
                          tick === 0
                            ? "none"
                            : tick === SCORE_MAX
                              ? "translateX(-100%)"
                              : "translateX(-50%)",
                      }}
                    >
                      {tick}
                    </span>
                  ))}
                </div>
              </div>

              <Separator className="my-6" />

              {/* ----- лепестковая диаграмма ----- */}
              <div className="h-[320px] w-full min-w-0 sm:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData} outerRadius="76%">
                    <PolarGrid stroke="var(--chart-grid)" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{
                        fill: "var(--chart-axis)",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tickCount={5}
                      // 64° — между двумя спицами: на 90° шкала налезает на
                      // верхнюю подпись оси.
                      angle={64}
                      axisLine={false}
                      tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
                    />
                    {/* Анимация выключена у всех серий: см. useAnimatedScores. */}
                    <Radar
                      name={t("chart.benchmark")}
                      dataKey="benchmark"
                      stroke="var(--chart-benchmark)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      fill="none"
                      isAnimationActive={false}
                      dot={false}
                    />
                    {modified && (
                      // Базовый профиль издания — виден только когда его
                      // изменили: это и есть визуальный смысл «а что если».
                      <Radar
                        name={t("selected.baseline")}
                        dataKey="baseline"
                        stroke={band.color}
                        strokeWidth={1.5}
                        strokeDasharray="2 3"
                        strokeOpacity={0.75}
                        fill="none"
                        isAnimationActive={false}
                        dot={false}
                      />
                    )}
                    <Radar
                      name={t("chart.outlet")}
                      dataKey="value"
                      stroke={band.color}
                      strokeWidth={2}
                      fill={band.color}
                      fillOpacity={0.18}
                      isAnimationActive={false}
                      dot={{ r: 3, fill: band.color, strokeWidth: 0 }}
                    />
                    <Tooltip content={RadarTooltip} cursor={false} />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      iconType="plainline"
                      iconSize={14}
                      formatter={(value) => (
                        <span className="text-xs text-muted-foreground">
                          {value}
                        </span>
                      )}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <Separator className="my-6" />

              {/* ----- сильная / слабая сторона ----- */}
              {scores[strongest.id] === scores[weakest.id] ? (
                <p className="rounded-md border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
                  {t("allEqual")}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: t("strongest"), criterion: strongest },
                    { label: t("weakest"), criterion: weakest },
                  ].map((item) => (
                    <div
                      key={item.criterion.id}
                      className="rounded-md border border-border bg-muted/40 p-3.5"
                    >
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {tc(`${item.criterion.id}.name`)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular">
                        {scores[item.criterion.id]} {tCommon("points")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={0.2}>
        <Recommendations plan={plan} className="mt-6" />
      </Reveal>

      {/* ---------------------- шкала интерпретации (таблица) ---------------------- */}
      <Reveal delay={0.22}>
        <Card className="ms7-surface mt-6">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">{t("scaleTitle")}</CardTitle>
            <CardDescription>{t("scaleSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <ul className="grid gap-2.5">
              {SMSI_BANDS.map((b) => {
                const isCurrent = b.id === band.id;
                return (
                  <li
                    key={b.id}
                    aria-current={isCurrent ? "true" : undefined}
                    className={
                      "flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border px-3.5 py-2.5 transition-colors " +
                      (isCurrent
                        ? "border-border bg-muted/60"
                        : "border-transparent")
                    }
                  >
                    <span className="w-20 shrink-0 text-sm font-semibold text-foreground tabular">
                      {b.min}–{b.max}
                    </span>
                    <SmsiBadge
                      band={b}
                      label={tb(`${b.id}.label`)}
                      size="sm"
                      className="min-w-0"
                    />
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                      {tb(`${b.id}.interpretation`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
