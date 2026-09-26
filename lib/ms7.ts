
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

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

const clampScore = (n: number) =>
  Math.min(SCORE_MAX, Math.max(SCORE_MIN, Number.isFinite(n) ? n : 0));



export function calculateSMSI(
  scores: CriteriaScores,
  weighted: boolean = true,
): number {
  const total = MS7_CRITERIA.reduce((sum, criterion) => {
    const weight = weighted ? criterion.weight : 1 / MS7_CRITERIA.length;
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
