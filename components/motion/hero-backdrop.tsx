"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const GLOW =
  "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_srgb,var(--primary)_9%,transparent),transparent_70%)]";
// Тёплый отсвет справа — за карточкой с радаром, в цвет золота логотипа.
const GOLD =
  "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(38%_45%_at_82%_30%,color-mix(in_srgb,var(--gold)_16%,transparent),transparent_70%)]";
const GRID =
  "pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_50%_at_50%_0%,#000,transparent)]";

export function HeroBackdrop() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();

  const gridY = useTransform(scrollY, [0, 700], [0, 110]);
  const glowY = useTransform(scrollY, [0, 700], [0, 50]);
  const gridOpacity = useTransform(scrollY, [0, 560], [0.35, 0.05]);

  if (reduced) {
    return (
      <>
        <div aria-hidden className={GLOW} />
        <div aria-hidden className={GOLD} />
        <div aria-hidden className={GRID} />
      </>
    );
  }

  return (
    <>
      <motion.div aria-hidden style={{ y: glowY }} className={GLOW} />
      <motion.div aria-hidden style={{ y: glowY }} className={GOLD} />
      <motion.div
        aria-hidden
        style={{ y: gridY, opacity: gridOpacity }}
        className={GRID}
      />
    </>
  );
}
