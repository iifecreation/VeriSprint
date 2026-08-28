"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

/**
 * Fade-and-rise-into-view on scroll, built on Framer Motion's `whileInView`
 * (IntersectionObserver under the hood — no manual scroll listeners). Runs
 * once per element (`viewport={{ once: true }}`) so re-scrolling past a
 * section doesn't replay the animation and feel gimmicky.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
  as: Component = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const MotionComponent = Component === "li" ? motion.li : motion.div;
  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </MotionComponent>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] } },
};

/** Wrap a grid/list with `<RevealGroup>` and each child with
 * `<RevealItem>` for a staggered cascade instead of everything fading in
 * at once — reads as more deliberate for a row of feature cards or steps. */
export function RevealGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/** Fires immediately on mount instead of on scroll-into-view — for
 * above-the-fold content (the hero) where there's no scroll to trigger off
 * yet, but the first thing a visitor sees should still visibly move in
 * rather than just appear. */
export function FadeInOnLoad({
  children,
  delay = 0,
  y = 16,
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
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
