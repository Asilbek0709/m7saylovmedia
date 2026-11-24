"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { TrendingUp } from "lucide-react";

import {
  calculateSMSI,
  MS7_CRITERIA,
  resolveBand,
  SMSI_BANDS,
  type CriteriaScores,
  type Weights,
} from "@/lib/ms7";

/**
 * Живая иллюстрация на главной: радар семи мезонов «перетекает» между
 * тремя турами мониторинга условного издания, индекс SMSI и уровень
 * меняются вместе с ним. Всё рисуется кодом — без видео и Lottie-файлов,
 * поэтому знак чёткий на любом экране и следует теме сайта.
 */

// Условный профиль издания по трём турам (порядок — как MS7_CRITERIA).
const ROUNDS: readonly number[][] = [
  [62, 58, 70, 46, 40, 52, 48],
  [74, 71, 78, 60, 55, 66, 62],
  [90, 87, 85, 76, 70, 81, 84],
];

const SIZE = 320;
const C = SIZE / 2;
const R = 118;
const angle = (i: number) => ((-90 + (i * 360) / MS7_CRITERIA.length) * Math.PI) / 180;
const point = (i: number, value: number) => {
  const r = (R * value) / 100;
  return [C + r * Math.cos(angle(i)), C + r * Math.sin(angle(i))] as const;
};
const polygon = (values: readonly number[]) =>
  values.map((v, i) => point(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");

const toScores = (values: readonly number[]) =>
  Object.fromEntries(MS7_CRITERIA.map((c, i) => [c.id, values[i]])) as CriteriaScores;

export interface HeroVisualLabels {
  /** Коды мезонов на языке страницы: ҲМ/HM, АС/AS… */
  codes: string[];
  /** Подписи уровней по id: veryhigh → «Juda yuqori». */
  bands: Record<string, string>;
  title: string;
  round: string;
  growth: string;
}

export function HeroVisual({
  weights,
  labels,
}: {
  weights: Weights;
  labels: HeroVisualLabels;
}) {
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState(reduced ? ROUNDS.length - 1 : 0);

  const indices = React.useMemo(
    () => ROUNDS.map((r) => calculateSMSI(toScores(r), true, weights)),
    [weights],
  );
  const smsi = indices[step];
  const band = resolveBand(smsi);
  const growth = step > 0 ? smsi - indices[step - 1] : null;

  // Смена тура раз в 3,2 с.
  React.useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setStep((s) => (s + 1) % ROUNDS.length),
      3200,
    );
    return () => window.clearInterval(id);
  }, [reduced]);

  // Число индекса плавно доезжает до нового значения — без перерисовок React.
  const shown = useMotionValue(0);
  const shownText = useTransform(shown, (v) => v.toFixed(1));
  React.useEffect(() => {
    if (reduced) {
      shown.set(smsi);
      return;
    }
    const controls = animate(shown, smsi, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [shown, smsi, reduced]);

  const values = ROUNDS[step];
  // Шкала 0–100 слева направо: от «Инқирозли» к «Жуда юқори».
  const scale = [...SMSI_BANDS].reverse();

  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[440px] select-none">
      {/* Плавающая плашка: прирост за тур */}
      <motion.div
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-4 -left-4 z-10 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-[0_8px_24px_rgb(15_42_71_/_0.10)]"
      >
        <TrendingUp className="size-4" style={{ color: "var(--smsi-high)" }} />
        <span className="text-muted-foreground">{labels.growth}</span>
        <span className="font-semibold text-foreground tabular">
          {growth === null ? "—" : `+${growth.toFixed(1)}`}
        </span>
      </motion.div>

      {/* Плавающая плашка: уровень */}
      <motion.div
        animate={reduced ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-3 bottom-24 z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium shadow-[0_8px_24px_rgb(15_42_71_/_0.10)]"
        style={{ color: band.color }}
      >
        {labels.bands[band.id]}
      </motion.div>

      <div className="ms7-surface rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-20px_rgb(15_42_71_/_0.25)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {labels.title}
            </p>
            <div className="mt-2 flex gap-1.5">
              {ROUNDS.map((_, i) => (
                <span
                  key={i}
                  className="rounded-md border px-2 py-0.5 text-[11px] transition-colors duration-500"
                  style={
                    i === step
                      ? { borderColor: band.color, color: band.color }
                      : undefined
                  }
                >
                  {labels.round.replace("{n}", String(i + 1))}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <motion.p
              className="text-4xl leading-none font-semibold tracking-tight tabular transition-colors duration-700"
              style={{ color: band.color }}
            >
              {shownText}
            </motion.p>
            <p className="mt-1 text-[11px] text-muted-foreground">SMSI</p>
          </div>
        </div>

        {/* Радар */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto mt-2 w-full max-w-[320px]">
          {[25, 50, 75, 100].map((level) => (
            <polygon
              key={level}
              points={polygon(MS7_CRITERIA.map(() => level))}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}
          {MS7_CRITERIA.map((c, i) => {
            const [x, y] = point(i, 100);
            return (
              <line key={c.id} x1={C} y1={C} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />
            );
          })}
          <motion.polygon
            initial={false}
            animate={{ points: polygon(values) }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            fill={band.color}
            fillOpacity={0.18}
            stroke={band.color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            style={{ transition: "fill 0.7s, stroke 0.7s" }}
          />
          {MS7_CRITERIA.map((c, i) => {
            const [x, y] = point(i, values[i]);
            return (
              <motion.circle
                key={c.id}
                initial={false}
                animate={{ cx: x, cy: y }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                r={4}
                fill="var(--card)"
                stroke={band.color}
                strokeWidth={2}
                style={{ transition: "stroke 0.7s" }}
              />
            );
          })}
          {MS7_CRITERIA.map((c, i) => {
            const [x, y] = point(i, 118);
            return (
              <text
                key={c.id}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={600}
                fill="var(--muted-foreground)"
              >
                {labels.codes[i]}
              </text>
            );
          })}
        </svg>

        {/* Шкала уровней с маркером */}
        <div className="relative mt-3">
          <div className="flex h-2 overflow-hidden rounded-full">
            {scale.map((b) => (
              <div
                key={b.id}
                style={{ background: b.color, flexGrow: b.max - b.min + 1, opacity: 0.85 }}
              />
            ))}
          </div>
          <motion.div
            initial={false}
            animate={{ left: `${Math.min(99, Math.max(1, smsi))}%` }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 bg-card"
            style={{ borderColor: band.color }}
          />
          <div className="relative mt-2 h-3 text-[10px] text-muted-foreground tabular">
            {[0, 45, 60, 75, 90].map((v) => (
              <span
                key={v}
                className="absolute"
                style={{
                  left: `${v}%`,
                  transform: v === 0 ? "none" : v === 100 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
