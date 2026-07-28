/**
 * MS-7 (Media Saylov — 7 mezonli baholash) — модель оценки цифровых СМИ
 * в период выборов, и интегральный индекс SMSI (Saylov Media Samaradorligi Indexi).
 *
 * Автор методики: Намозов Ж.А., ЎзЖОКУ.
 *
 * Здесь только структура модели: идентификаторы, веса, границы уровней и
 * цветовые токены. Все отображаемые названия живут в `messages/*.json`,
 * потому что интерфейс трёхъязычный (uz / ru / en).
 */

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
  /** Весовой коэффициент в интегральном индексе. Сумма по всем = 1. */
  weight: number;
}

/**
 * Веса модели MS-7. Правовое соответствие и качество информации несут
 * наибольший вес: в избирательный период именно они определяют
 * законность и достоверность информационного потока.
 */
export const MS7_CRITERIA: readonly Criterion[] = [
  { id: "legal", weight: 0.18 },
  { id: "quality", weight: 0.18 },
  { id: "speed", weight: 0.14 },
  { id: "multimedia", weight: 0.12 },
  { id: "interactivity", weight: 0.12 },
  { id: "engagement", weight: 0.14 },
  { id: "convergence", weight: 0.12 },
] as const;

/** Баллы эксперта по каждому из 7 критериев, шкала 0–100. */
export type CriteriaScores = Record<CriterionId, number>;

export type SmsiBandId =
  | "veryhigh"
  | "high"
  | "moderate"
  | "poor"
  | "critical";

export interface SmsiBand {
  id: SmsiBandId;
  /** Нижняя и верхняя границы диапазона, включительно. */
  min: number;
  max: number;
  /**
   * Ссылки на CSS-переменные, а не литеральные hex: у светлой и тёмной темы
   * свои валидированные ступени (см. app/globals.css). Браузеры разрешают
   * var() и в презентационных атрибутах SVG, поэтому те же токены уходят
   * в Recharts.
   */
  color: string;
  wash: string;
  ink: string;
}

/**
 * Шкала интерпретации SMSI. Цвета — ординальная шкала с монотонной
 * светлотой, поэтому порядок уровней читается и без цвета; уровень
 * всегда сопровождается текстовой меткой (см. components/smsi-badge.tsx).
 */
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

/**
 * Интегральный индекс SMSI — взвешенная сумма баллов по 7 критериям.
 *
 * @param scores  баллы 0–100 по каждому критерию
 * @param weighted `false` переключает на равные веса (1/7) — режим
 *   сравнения, который методика допускает для контрольного пересчёта.
 * @returns значение 0–100, округлённое до одного знака.
 */
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

/**
 * Уровень (даража) и его цветовая категория для значения индекса.
 *
 * Сравнение идёт только по нижней границе: границы уровней в методике
 * записаны целыми (60–74, 75–89), а индекс дробный, поэтому проверка
 * `value <= max` оставила бы дыры — 74.6 не попал бы никуда. Та же логика
 * в public.smsi_band() (supabase/schema.sql), чтобы БД и клиент
 * никогда не разошлись.
 */
export function resolveBand(smsi: number): SmsiBand {
  const value = clampScore(smsi);
  return (
    // SMSI_BANDS упорядочены по убыванию min.
    SMSI_BANDS.find((band) => value >= band.min) ??
    SMSI_BANDS[SMSI_BANDS.length - 1]
  );
}

/** Самый слабый критерий — на что рекомендации указывают в первую очередь. */
export function weakestCriterion(scores: CriteriaScores): Criterion {
  return MS7_CRITERIA.reduce((weakest, criterion) =>
    scores[criterion.id] < scores[weakest.id] ? criterion : weakest,
  );
}

/** Самый сильный критерий. */
export function strongestCriterion(scores: CriteriaScores): Criterion {
  return MS7_CRITERIA.reduce((best, criterion) =>
    scores[criterion.id] > scores[best.id] ? criterion : best,
  );
}

/**
 * Стартовый профиль калькулятора. Намеренно неравномерный: на равных
 * баллах лепестковая диаграмма вырождается в правильный семиугольник, а
 * «сильный» и «слабый» мезон совпадают — читается как поломка.
 */
export const DEFAULT_SCORES: CriteriaScores = {
  legal: 82,
  quality: 79,
  speed: 86,
  multimedia: 74,
  interactivity: 68,
  engagement: 81,
  convergence: 76,
};
