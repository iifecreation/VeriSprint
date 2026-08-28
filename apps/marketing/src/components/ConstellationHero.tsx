/**
 * An illustrated hero backdrop — a soft teal horizon glow rising behind a
 * sparse network of connected nodes, evoking "verified signal traveling
 * through a graph" (commits -> evidence -> score) rather than decoration
 * for its own sake. Pure SVG + CSS, no canvas/JS dependency: a radial glow,
 * a fixed hand-placed node graph (not random per render, so it never
 * reflows oddly), and a slow opacity pulse on each node — same
 * "transform/opacity only, always-on, no scroll trigger" discipline as
 * HeroBackground's blobs. Masked to fade out before it reaches the
 * headline text so it never fights with readability.
 */
const NODES: { x: number; y: number; r: number; delay: number }[] = [
  { x: 60, y: 40, r: 2.4, delay: 0 },
  { x: 180, y: 90, r: 1.8, delay: 0.6 },
  { x: 320, y: 30, r: 2.2, delay: 1.2 },
  { x: 470, y: 70, r: 1.6, delay: 0.3 },
  { x: 620, y: 25, r: 2.6, delay: 1.8 },
  { x: 760, y: 85, r: 1.8, delay: 0.9 },
  { x: 900, y: 45, r: 2.2, delay: 1.5 },
  { x: 1040, y: 95, r: 1.7, delay: 0.2 },
  { x: 1160, y: 35, r: 2.4, delay: 1.1 },
  { x: 240, y: 140, r: 1.5, delay: 2.1 },
  { x: 540, y: 130, r: 1.9, delay: 0.7 },
  { x: 850, y: 140, r: 1.5, delay: 1.6 },
  { x: 1100, y: 130, r: 1.7, delay: 2.4 },
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
  [1, 9], [9, 10], [3, 10], [10, 11], [7, 11], [8, 12], [11, 12], [5, 10],
];

export function ConstellationHero() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        viewBox="0 0 1200 220"
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-x-0 top-0 h-[280px] w-full opacity-80 sm:h-[340px]"
      >
        <defs>
          <radialGradient id="horizon-glow" cx="50%" cy="0%" r="75%">
            <stop offset="0%" stopColor="#4fb8c4" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#16302f" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0c1615" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fade-mask-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="fade-mask">
            <rect x="0" y="0" width="1200" height="220" fill="url(#fade-mask-grad)" />
          </mask>
        </defs>

        <rect x="0" y="0" width="1200" height="220" fill="url(#horizon-glow)" />

        <g mask="url(#fade-mask)" stroke="#4fb8c4" strokeOpacity="0.22" strokeWidth="1">
          {EDGES.map(([a, b], i) => (
            <line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} />
          ))}
        </g>

        <g mask="url(#fade-mask)">
          {NODES.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="#74c9d3" className="animate-node-pulse" style={{ animationDelay: `${n.delay}s` }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
