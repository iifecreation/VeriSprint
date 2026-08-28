/**
 * Three large, blurred, slowly-drifting color blobs behind hero content —
 * pure CSS animation (see the blob-drift keyframes in globals.css), so it's
 * always running from first paint with no scroll trigger or JS framework to
 * depend on. Absolutely positioned, `pointer-events-none`, sits behind
 * `relative z-10+` content in the same section.
 */
export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="animate-blob-a absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#4fb8c4]/15 blur-3xl" />
      <div className="animate-blob-b absolute top-10 right-[-10rem] h-[24rem] w-[24rem] rounded-full bg-[#16302f]/60 blur-3xl" />
      <div className="animate-blob-c absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#74c9d3]/15 blur-3xl" />
    </div>
  );
}
