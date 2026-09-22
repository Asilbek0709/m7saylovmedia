"use client";

import * as React from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

export function CountUp({
  value,
  decimals = 0,
  duration = 1.2,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();

  const count = useMotionValue(reduced ? value : 0);
  const text = useTransform(count, (v) => v.toFixed(decimals));

  React.useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(count, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [inView, reduced, count, value, duration]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}
