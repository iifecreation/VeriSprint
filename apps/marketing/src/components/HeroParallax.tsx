"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/**
 * A gentle GSAP-driven parallax + entrance on the hero mock panel — moves
 * at a different rate than the page scroll and eases in with a slight
 * overshoot on load. Deliberately subtle (a few percent of viewport
 * height, capped) — the point is a sense of depth, not a distracting
 * scroll-jack on the page's first, most-scrutinized section.
 *
 * Entrance (opacity/scale) and scroll parallax (y) are split across two
 * nested elements so neither tween's `overwrite` can interrupt the other.
 *
 * Also guards against a real (not just test-tooling) edge case: GSAP's
 * default ticker rides `requestAnimationFrame`, which browsers throttle or
 * fully pause on a backgrounded/hidden tab — if that happens mid-entrance,
 * the element is left stuck at partial opacity indefinitely, since rAF
 * never fires again to finish the tween. The `visibilitychange` listener
 * below snaps any in-flight entrance tween to its end state the moment the
 * tab is hidden, so a user who opens this page in a background tab still
 * sees fully-visible content whenever they actually look at it.
 */
export function HeroParallax({ children, className = "" }: { children: ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (!outerRef.current || !innerRef.current) return;

      const entrance = gsap.fromTo(
        outerRef.current,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.9, ease: "power3.out", delay: 0.15 }
      );

      const finishIfHidden = () => {
        if (document.hidden) entrance.progress(1);
      };
      document.addEventListener("visibilitychange", finishIfHidden);
      // Also covers the case where the tab was already hidden before this
      // effect even ran (e.g. opened in a background tab from the start).
      finishIfHidden();

      const onScroll = () => {
        if (!innerRef.current) return;
        const shift = Math.min(window.scrollY * 0.08, 40);
        gsap.to(innerRef.current, { y: shift, duration: 0.3, ease: "power1.out", overwrite: "auto" });
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        document.removeEventListener("visibilitychange", finishIfHidden);
        window.removeEventListener("scroll", onScroll);
      };
    }, outerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={outerRef} className={className}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
