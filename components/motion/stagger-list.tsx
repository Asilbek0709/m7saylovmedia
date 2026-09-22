"use client";

import { motion, useReducedMotion } from "framer-motion";

const ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.ul
      className={className}
      initial={reduced ? false : "hidden"}
      whileInView={reduced ? undefined : "show"}
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: 0.09 } } }}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.li
      className={className}
      variants={reduced ? undefined : ITEM}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.li>
  );
}
