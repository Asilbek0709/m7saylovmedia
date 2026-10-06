import {
  calculateSMSI,
  MS7_CRITERIA,
  resolveBand,
  SCORE_MAX,
  SMSI_BANDS,
  type CriteriaScores,
  type CriterionId,
  type IndicatorScores,
  type SmsiBandId,
} from "@/lib/ms7";

export interface RecommendationStep {
  criterion: CriterionId;
  from: number;
  to: number;
  gain: number;
  weakIndicators: number[];
}

export interface RecommendationPriority {
  criterion: CriterionId;
  score: number;
  potential: number;
  gainPer10: number;
  weakIndicators: number[];
}

export interface RecommendationPlan {
  smsi: number;
  band: SmsiBandId;
  nextBand: SmsiBandId | null;
  target: number | null;
  gap: number;
  steps: RecommendationStep[];
  projected: number;
  priorities: RecommendationPriority[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const RELEVANCE = 0.25;

function weakestIndicators(values: readonly number[] | undefined) {
  if (!values || values.length < 2) return [];
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values
    .map((value, index) => ({ value, index }))
    .filter((item) => item.value < mean)
    .sort((a, b) => a.value - b.value || a.index - b.index)
    .slice(0, 2)
    .map((item) => item.index);
}

export function buildRecommendations(
  scores: CriteriaScores,
  options: {
    weighted?: boolean;
    indicators?: IndicatorScores | null;
    /**
     * Индекс, записанный в базе. Он может отличаться от пересчёта по
     * баллам: база считает от неокруглённых средних экспертов и весами
     * своей версии. План тогда строится от записанного значения.
     */
    smsi?: number;
  } = {},
): RecommendationPlan {
  const weighted = options.weighted ?? true;
  const weightOf = (id: CriterionId) =>
    weighted
      ? MS7_CRITERIA.find((c) => c.id === id)!.weight
      : 1 / MS7_CRITERIA.length;

  const offset =
    options.smsi === undefined
      ? 0
      : options.smsi - calculateSMSI(scores, weighted);
  const smsiOf = (s: CriteriaScores) =>
    round1(calculateSMSI(s, weighted) + offset);

  const smsi = smsiOf(scores);
  const band = resolveBand(smsi);
  const bandIndex = SMSI_BANDS.findIndex((b) => b.id === band.id);
  const next = bandIndex > 0 ? SMSI_BANDS[bandIndex - 1] : null;

  const priorities = MS7_CRITERIA.filter((c) => scores[c.id] < SCORE_MAX)
    .sort(
      (a, b) =>
        weightOf(b.id) * (SCORE_MAX - scores[b.id]) -
          weightOf(a.id) * (SCORE_MAX - scores[a.id]) ||
        MS7_CRITERIA.indexOf(a) - MS7_CRITERIA.indexOf(b),
    )
    .slice(0, 3)
    .map((c) => ({
      criterion: c.id,
      score: scores[c.id],
      potential: round1(weightOf(c.id) * (SCORE_MAX - scores[c.id])),
      gainPer10: round1(weightOf(c.id) * Math.min(10, SCORE_MAX - scores[c.id])),
      weakIndicators: weakestIndicators(options.indicators?.[c.id]),
    }))
    .filter((p, _, all) => p.potential >= all[0].potential * RELEVANCE);

  if (!next) {
    return {
      smsi,
      band: band.id,
      nextBand: null,
      target: null,
      gap: 0,
      steps: [],
      projected: smsi,
      priorities,
    };
  }

  const target = next.min;
  const order = MS7_CRITERIA.filter((c) => scores[c.id] < target).sort(
    (a, b) =>
      weightOf(b.id) * (target - scores[b.id]) -
        weightOf(a.id) * (target - scores[a.id]) ||
      MS7_CRITERIA.indexOf(a) - MS7_CRITERIA.indexOf(b),
  );

  let working = { ...scores };
  const steps: RecommendationStep[] = [];

  for (const criterion of order) {
    const before = smsiOf(working);
    if (before >= target) break;

    // Средние экспертов дробные — цель шага всегда целый балл.
    let to = Math.floor(working[criterion.id]);
    while (to < target) {
      to += 1;
      if (smsiOf({ ...working, [criterion.id]: to }) >= target) {
        break;
      }
    }

    working = { ...working, [criterion.id]: to };
    steps.push({
      criterion: criterion.id,
      from: scores[criterion.id],
      to,
      gain: round1(smsiOf(working) - before),
      weakIndicators: weakestIndicators(options.indicators?.[criterion.id]),
    });
  }

  return {
    smsi,
    band: band.id,
    nextBand: next.id,
    target,
    gap: round1(target - smsi),
    steps,
    projected: smsiOf(working),
    priorities,
  };
}
