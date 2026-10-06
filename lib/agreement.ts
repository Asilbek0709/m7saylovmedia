import { createClient } from "@/lib/supabase/server";

/**
 * Согласованность экспертов тура — представление period_agreement
 * (supabase/007-experts.sql). W считается в базе: индивидуальные оценки
 * закрыты, наружу выходит только коэффициент.
 */
export interface PeriodAgreement {
  period: string;
  experts: number;
  /** Изданий, которые оценили все эксперты тура. */
  outlets: number;
  /** Коэффициент конкордации Кендалла; null — меньше 2 экспертов или изданий. */
  w: number | null;
  chi2: number | null;
  df: number | null;
  /** Вероятность получить такое согласие случайно; null, если W не определён. */
  p: number | null;
}

/** Сила согласия по шкале Шмидта (1997), разбитой на равные отрезки. */
export type AgreementLevel =
  | "veryWeak"
  | "weak"
  | "moderate"
  | "strong"
  | "veryStrong";

export function agreementLevel(w: number): AgreementLevel {
  if (w < 0.2) return "veryWeak";
  if (w < 0.4) return "weak";
  if (w < 0.6) return "moderate";
  if (w < 0.8) return "strong";
  return "veryStrong";
}

/** Уровень значимости, принятый для вывода о неслучайности согласия. */
export const SIGNIFICANCE = 0.05;

/* ------------------------------------------------------------------ */
/*  Хи-квадрат: p = Q(df/2, χ²/2), регуляризованная неполная гамма     */
/* ------------------------------------------------------------------ */

function lnGamma(x: number): number {
  // Приближение Ланцоша, g = 7.
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Верхняя регуляризованная неполная гамма-функция Q(a, x). */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const gln = lnGamma(a);

  if (x < a + 1) {
    // Ряд для P(a, x), Q = 1 − P.
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 500; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gln);
  }

  // Цепная дробь Лентца для Q(a, x).
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

export function chiSquarePValue(chi2: number, df: number): number {
  return Math.min(1, Math.max(0, gammaQ(df / 2, chi2 / 2)));
}

/* ------------------------------------------------------------------ */

export async function getPeriodAgreement(
  period: string,
): Promise<PeriodAgreement | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("period_agreement")
      .select("period, experts, outlets, kendall_w, chi2, df")
      .eq("period", period)
      .maybeSingle();

    // До 007-experts.sql представления нет — блок просто не показывается.
    if (error || !data) return null;

    const w = data.kendall_w === null ? null : Number(data.kendall_w);
    const chi2 = data.chi2 === null ? null : Number(data.chi2);
    const df = data.df === null ? null : Number(data.df);

    return {
      period: data.period as string,
      experts: Number(data.experts),
      outlets: Number(data.outlets),
      w,
      chi2,
      df,
      p: chi2 !== null && df ? chiSquarePValue(chi2, df) : null,
    };
  } catch {
    return null;
  }
}
