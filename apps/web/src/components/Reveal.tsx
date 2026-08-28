"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

/**
 * Dashboard content is mostly above-the-fold data fetched right after
 * mount, not a long marketing page you scroll through — so these animate
 * in on mount/data-arrival (`animate`, not `whileInView`) rather than on
 * scroll-into-view. Same fade+rise treatment as the marketing site's
 * Reveal, just triggered differently to fit how this app is actually used.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 12,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] } },
};

/** Wrap a list/grid with `<StaggerGroup>` and each child with
 * `<StaggerItem>` for a cascade instead of a list that just appears —
 * `mode="popLayout"` isn't needed here since these mount once per fetch,
 * not on every keystroke. */
export function StaggerGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="visible" variants={staggerContainer}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
