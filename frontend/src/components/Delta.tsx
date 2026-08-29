import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function Delta({
  value,
  suffix = "%",
}: {
  value: number;
  suffix?: string;
}) {
  const pos = value >= 0;
  const Icon = pos ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[12px] font-semibold tnum ${
        pos ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"
      }`}
    >
      <Icon size={13} strokeWidth={2.5} />
      {pos ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}
