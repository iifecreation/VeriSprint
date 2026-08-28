import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI's Marquee pattern: two identical copies of `children` laid edge
 * to edge inside a track that scrolls left by exactly one copy's width
 * (see `.animate-marquee-scroll` in globals.css) — the loop point is
 * invisible since copy #2 sliding into view is pixel-identical to copy #1
 * sliding out. `pauseOnHover` just toggles the animation via CSS, no JS
 * state needed.
 */
export function Marquee({
  children,
  className,
  durationSeconds = 30,
  pauseOnHover = true,
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  durationSeconds?: number;
  pauseOnHover?: boolean;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn("group flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]", className)}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className={cn(
            "flex shrink-0 animate-marquee-scroll items-center justify-around gap-12 pr-12",
            reverse && "[animation-direction:reverse]",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
          style={{ "--marquee-duration": `${durationSeconds}s` } as React.CSSProperties}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
