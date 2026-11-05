
export type CriterionId =
  | "legal"
  | "quality"
  | "speed"
  | "multimedia"
  | "interactivity"
  | "engagement"
  | "convergence";

export interface Criterion {
  id: CriterionId;

  weight: number;
}


/**
 * Веса версии 1 модели. Запись истины — таблица public.weight_sets
 * (supabase/006-weight-sets.sql): сохранённые индексы считает база, а
 * страницы получают действующие веса через lib/weights.ts и передают их
 * в calculateSMSI. Эти константы нужны только в демо-режиме, без базы.
 */
export const WEIGHTS_VERSION = 1;

export const MS7_CRITERIA: readonly Criterion[] = [
  { id: "legal", weight: 0.18 },
  { id: "quality", weight: 0.18 },
  { id: "speed", weight: 0.14 },
  { id: "multimedia", weight: 0.12 },
  { id: "interactivity", weight: 0.12 },
  { id: "engagement", weight: 0.14 },
  { id: "convergence", weight: 0.12 },
] as const;


export type CriteriaScores = Record<CriterionId, number>;

/** Веса мезонов: доли, в сумме 1. */
export type Weights = Record<CriterionId, number>;

/** Веса из кода — для демо-режима и как значение по умолчанию. */
export const DEFAULT_WEIGHTS: Weights = Object.fromEntries(
  MS7_CRITERIA.map((c) => [c.id, c.weight]),
) as Weights;

export type SmsiBandId =
  | "veryhigh"
  | "high"
  | "moderate"
  | "poor"
  | "critical";

export interface SmsiBand {
  id: SmsiBandId;

  min: number;
  max: number;

  color: string;
  wash: string;
  ink: string;
}


export const SMSI_BANDS: readonly SmsiBand[] = [
  {
    id: "veryhigh",
    min: 90,
    max: 100,
    color: "var(--smsi-veryhigh)",
    wash: "var(--smsi-veryhigh-wash)",
    ink: "var(--smsi-veryhigh-ink)",
  },
  {
    id: "high",
    min: 75,
    max: 89,
    color: "var(--smsi-high)",
    wash: "var(--smsi-high-wash)",
    ink: "var(--smsi-high-ink)",
  },
  {
    id: "moderate",
    min: 60,
    max: 74,
    color: "var(--smsi-moderate)",
    wash: "var(--smsi-moderate-wash)",
    ink: "var(--smsi-moderate-ink)",
  },
  {
    id: "poor",
    min: 45,
    max: 59,
    color: "var(--smsi-poor)",
    wash: "var(--smsi-poor-wash)",
    ink: "var(--smsi-poor-ink)",
  },
  {
    id: "critical",
    min: 0,
    max: 44,
    color: "var(--smsi-critical)",
    wash: "var(--smsi-critical-wash)",
    ink: "var(--smsi-critical-ink)",
  },
] as const;

/** Балл для показа: целые — как есть, средние экспертов — с одним знаком. */
export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

const clampScore = (n: number) =>
  Math.min(SCORE_MAX, Math.max(SCORE_MIN, Number.isFinite(n) ? n : 0));



export function calculateSMSI(
  scores: CriteriaScores,
  weighted: boolean = true,
  weights: Weights = DEFAULT_WEIGHTS,
): number {
  const total = MS7_CRITERIA.reduce((sum, criterion) => {
    const weight = weighted ? weights[criterion.id] : 1 / MS7_CRITERIA.length;
    return sum + clampScore(scores[criterion.id]) * weight;
  }, 0);

  return Math.round(total * 10) / 10;
}


export function resolveBand(smsi: number): SmsiBand {
  const value = clampScore(smsi);
  return (

    SMSI_BANDS.find((band) => value >= band.min) ??
    SMSI_BANDS[SMSI_BANDS.length - 1]
  );
}


export function weakestCriterion(scores: CriteriaScores): Criterion {
  return MS7_CRITERIA.reduce((weakest, criterion) =>
    scores[criterion.id] < scores[weakest.id] ? criterion : weakest,
  );
}


export function strongestCriterion(scores: CriteriaScores): Criterion {
  return MS7_CRITERIA.reduce((best, criterion) =>
    scores[criterion.id] > scores[best.id] ? criterion : best,
  );
}


export const DEFAULT_SCORES: CriteriaScores = {
  legal: 82,
  quality: 79,
  speed: 86,
  multimedia: 74,
  interactivity: 68,
  engagement: 81,
  convergence: 76,
};

export type IndicatorScores = Record<CriterionId, number[]>;

export function criterionFromIndicators(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function scoresFromIndicators(indicators: IndicatorScores): CriteriaScores {
  return Object.fromEntries(
    MS7_CRITERIA.map((c) => [c.id, criterionFromIndicators(indicators[c.id])]),
  ) as CriteriaScores;
}

export function indicatorsFromScores(
  scores: CriteriaScores,
  counts: Record<CriterionId, number>,
): IndicatorScores {
  return Object.fromEntries(
    MS7_CRITERIA.map((c) => [c.id, Array(counts[c.id]).fill(scores[c.id])]),
  ) as IndicatorScores;
}
