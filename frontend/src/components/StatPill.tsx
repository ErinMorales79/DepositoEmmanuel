import Delta from "./Delta";

export default function StatPill({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
}) {
  return (
    <div className="hidden items-center gap-3 rounded-control border border-line bg-surface-1 px-3.5 py-1.5 lg:flex">
      <div className="leading-tight">
        <div className="label">{label}</div>
        <div className="font-display text-[13px] font-semibold tracking-tightish tnum">
          {value}
        </div>
      </div>
      {delta != null ? (
        <Delta value={delta} />
      ) : hint ? (
        <span className="whitespace-nowrap text-[11px] font-medium text-ink-3">{hint}</span>
      ) : null}
    </div>
  );
}
