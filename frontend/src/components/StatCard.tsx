import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  to?: string;
  tone?: "default" | "accent" | "warn";
}

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  tone = "default",
}: Props) {
  const inner = (
    <div className="card h-full p-4 transition group-hover:border-line-strong">
      <div className="flex items-start justify-between gap-2">
        <span className="label">{label}</span>
        {Icon && (
          <span
            className={`grid h-8 w-8 place-items-center rounded-control ${
              tone === "accent"
                ? "bg-accent/15 text-brand"
                : tone === "warn"
                  ? "bg-amber-400/10 text-amber-600 dark:text-amber-400"
                  : "bg-surface-2 text-ink-2"
            }`}
          >
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="mt-2 font-display text-2xl font-bold tracking-tightish tnum">
        {value}
      </div>
      {hint && <div className="mt-1 text-[12px] text-ink-3">{hint}</div>}
    </div>
  );

  return to ? (
    <Link to={to} className="group block">
      {inner}
    </Link>
  ) : (
    <div className="group">{inner}</div>
  );
}
