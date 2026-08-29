import type { ReactNode } from "react";

type Tone = "neutral" | "pos" | "neg" | "warn" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  pos: "bg-pos/10 text-pos border-transparent",
  neg: "bg-neg/10 text-neg border-transparent",
  warn: "bg-amber-400/10 text-amber-600 border-transparent dark:text-amber-300",
  accent: "bg-accent/15 text-brand border-transparent",
};

export default function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-pill border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
