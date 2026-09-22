"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

export interface FormulaStep {
  id: string;
  short: string;
  name: string;
  value: number;
  weight: number;
}

export interface FormulaLabels {
  contribution: string;
  running: string;
  total: string;
  score: string;
  weight: string;
  profile: string;
}

const VIEW = 560;
const CENTER = VIEW / 2;
const RADIUS = 135;
const LABEL_RADIUS = RADIUS + 28;
const BOX = { x: -14, y: 100, w: 588, h: 345 };
const RINGS = [0.25, 0.5, 0.75, 1];
const EASE = [0.22, 1, 0.36, 1] as const;

function pointAt(index: number, total: number, radius: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function polygonPath(radii: number[]) {
  const total = radii.length;
  return (
    radii
      .map((r, i) => {
        const p = pointAt(i, total, r);
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
}

export function ScrollFormula({
  steps,
  labels,
  bandLabel,
  bandColor,
}: {
  steps: FormulaStep[];
  labels: FormulaLabels;
  bandLabel: string;
  bandColor: string;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = React.useState(reduced ? steps.length - 1 : -1);

  const total = steps.reduce((sum, s) => sum + s.value * s.weight, 0);
  const running = steps
    .slice(0, active + 1)
    .reduce((sum, s) => sum + s.value * s.weight, 0);

  const runningValue = useMotionValue(reduced ? total : 0);
  const runningText = useTransform(runningValue, (v) => v.toFixed(1));

  React.useEffect(() => {
    if (reduced) return;
    const controls = animate(runningValue, running, {
      duration: 0.55,
      ease: EASE,
    });
    return () => controls.stop();
  }, [running, runningValue, reduced]);

  const revealed = useMotionValue(reduced ? steps.length : 0);
  const shapeD = useTransform(revealed, (r) =>
    polygonPath(
      steps.map((s, i) => {
        const t = Math.min(1, Math.max(0, r - i));
        return (s.value / 100) * RADIUS * t;
      }),
    ),
  );

  React.useEffect(() => {
    if (reduced) return;
    const controls = animate(revealed, active + 1, {
      duration: 0.6,
      ease: EASE,
    });
    return () => controls.stop();
  }, [active, revealed, reduced]);

  const complete = active >= steps.length - 1;

  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-16">
      <div className="sticky top-16 z-10 -mx-4 border-b border-border bg-background/90 px-4 py-4 backdrop-blur lg:top-28 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <div className="mx-auto max-w-[260px] lg:max-w-none">
          <svg
            viewBox={`${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`}
            className="w-full"
            role="img"
            aria-label={labels.profile}
          >
            {RINGS.map((ring) => (
              <path
                key={ring}
                d={polygonPath(steps.map(() => RADIUS * ring))}
                fill="none"
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
            ))}

            {steps.map((step, i) => {
              const p = pointAt(i, steps.length, RADIUS);
              const on = i <= active;
              return (
                <motion.line
                  key={step.id}
                  x1={CENTER}
                  y1={CENTER}
                  x2={p.x}
                  y2={p.y}
                  stroke={on ? "var(--primary)" : "var(--chart-grid)"}
                  strokeWidth={on ? 1.5 : 1}
                  animate={{ opacity: on ? 0.55 : 1 }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              );
            })}

            <motion.path
              d={shapeD}
              fill="var(--primary)"
              fillOpacity={0.14}
              stroke="var(--primary)"
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {steps.map((step, i) => {
              const on = i <= active;
              const p = pointAt(i, steps.length, on ? (step.value / 100) * RADIUS : 0);
              return (
                <motion.g
                  key={step.id}
                  initial={false}
                  animate={{ x: p.x, y: p.y, opacity: on ? 1 : 0 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <circle
                    r={i === active ? 5 : 3.5}
                    fill={i === active ? bandColor : "var(--primary)"}
                  />
                </motion.g>
              );
            })}

            {steps.map((step, i) => {
              const p = pointAt(i, steps.length, LABEL_RADIUS);
              const anchor =
                p.x > CENTER + 6 ? "start" : p.x < CENTER - 6 ? "end" : "middle";
              return (
                <motion.text
                  key={step.id}
                  x={p.x}
                  y={p.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className="text-[17px] font-medium"
                  fill={i === active ? "var(--foreground)" : "var(--chart-axis)"}
                  animate={{ opacity: i <= active ? 1 : 0.45 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  {step.short}
                </motion.text>
              );
            })}
          </svg>

          <div className="mt-3 flex items-baseline justify-between gap-3 lg:mt-6">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {complete ? labels.total : labels.running}
            </span>
            <span className="flex items-baseline gap-1.5">
              <motion.span
                className="text-3xl leading-none font-semibold tracking-tight tabular lg:text-4xl"
                animate={{ color: complete ? bandColor : "var(--foreground)" }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {runningText}
              </motion.span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </span>
          </div>

          <motion.p
            className="mt-1 text-right text-xs font-medium"
            style={{ color: bandColor }}
            animate={{ opacity: complete ? 1 : 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {bandLabel}
          </motion.p>
        </div>
      </div>

      <ol className="space-y-[15vh] pt-[6vh] pb-[8vh] lg:space-y-[20vh]">
        {steps.map((step, i) => {
          const contribution = step.value * step.weight;
          return (
            <motion.li
              key={step.id}
              onViewportEnter={() => setActive(i)}
              viewport={{ margin: "-45% 0px -45% 0px", amount: "some" }}
              animate={{ opacity: reduced || i <= active ? 1 : 0.4 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="rounded-lg border border-border bg-card px-5 py-5 ms7-surface sm:px-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold tracking-wide text-muted-foreground tabular">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                    {step.name}
                  </h3>
                </div>
                <motion.span
                  className="shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold tabular"
                  animate={{
                    backgroundColor:
                      i === active ? bandColor : "var(--secondary)",
                    color:
                      i === active
                        ? "var(--primary-foreground)"
                        : "var(--secondary-foreground)",
                  }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  {step.value}
                </motion.span>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3.5 text-sm">
                <div>
                  <dt className="text-[11px] text-muted-foreground">
                    {labels.score}
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground tabular">
                    {step.value}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">
                    {labels.weight}
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground tabular">
                    {step.weight.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">
                    {labels.contribution}
                  </dt>
                  <dd className="mt-0.5 font-semibold text-foreground tabular">
                    +{contribution.toFixed(2)}
                  </dd>
                </div>
              </dl>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
