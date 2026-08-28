/**
 * A small rotating accent palette for feature/product cards — icon chip
 * background + text color, keyed by index so a grid of cards reads as
 * colorful and distinct instead of the same single brand tone repeated on
 * every card. Colors chosen to stay legible on a light card background and
 * to sit comfortably alongside the brand teal (#004B55) and neon-blue accent
 * without either of the two currently-brand tones being reused here.
 *
 * Every class name below is a full, literal string — Tailwind's build-time
 * scanner only picks up classes it can find as exact substrings in source,
 * so these can never be assembled at runtime (e.g. `text-${color}-700` or
 * `.replace("text-", "border-t-")`); each variant has to be spelled out.
 */
export const CARD_ACCENTS = [
  { bg: "bg-teal-50", text: "text-teal-700", border: "border-t-teal-600" },
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-t-violet-600" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-t-amber-600" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-t-rose-600" },
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-t-blue-600" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-t-emerald-600" },
] as const;

export function cardAccent(index: number) {
  return CARD_ACCENTS[((index % CARD_ACCENTS.length) + CARD_ACCENTS.length) % CARD_ACCENTS.length];
}
