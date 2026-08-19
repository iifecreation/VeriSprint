"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * A vertical progress line that fills as you scroll past it, with each
 * step's number circle lighting up (color + scale) the moment you reach it
 * — scrubbed continuously to scroll position via GSAP's ScrollTrigger,
 * which is the one thing Framer Motion's `whileInView` (discrete
 * enter/exit triggers, no scroll scrubbing) doesn't do well. Used
 * specifically for the how-it-works pipeline, where "progress through a
 * sequence" is the actual content, not just decoration.
 */
export function PipelineTimeline({ steps }: { steps: { title: ReactNode; body: ReactNode }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      if (!containerRef.current || !fillRef.current) return;

      // The fill bar's scaleY tracks scroll progress through the whole
      // container, 0 → 1 — a continuous scrub, not a one-shot animation.
      gsap.fromTo(
        fillRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 30%",
            end: "bottom 70%",
            scrub: 0.4,
          },
        }
      );

      // Each circle gets its own trigger so it "activates" right as its
      // step reaches the reading position, independent of the others.
      circleRefs.current.forEach((circle) => {
        if (!circle) return;
        gsap.to(circle, {
          backgroundColor: "var(--accent-neon)",
          borderColor: "var(--accent-neon)",
          color: "#1a2e05",
          scale: 1.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: circle,
            start: "top 55%",
            end: "top 30%",
            scrub: 0.3,
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Track (static) + fill (animated) */}
      <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200 hidden md:block" />
      <div
        ref={fillRef}
        className="absolute left-6 top-6 bottom-6 w-0.5 origin-top bg-[var(--accent-neon)] hidden md:block"
        style={{ transform: "scaleY(0)" }}
      />

      <div className="space-y-8 relative">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-6 md:gap-10">
            <div
              ref={(el) => {
                circleRefs.current[i] = el;
              }}
              className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-full bg-white border border-brand/20 items-center justify-center shadow-sm relative z-10 text-brand font-bold"
            >
              {i + 1}
            </div>
            <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
