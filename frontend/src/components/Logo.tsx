export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 2.4 24.3 8v12L14 25.6 3.7 20V8L14 2.4Z" fill="#c4ef4a" />
        <path d="M14 9.1 19.1 12v5L14 19.9 8.9 17v-5L14 9.1Z" fill="#10210a" />
      </svg>
      <span className="hidden font-display text-[15px] font-bold tracking-tightish sm:inline">
        DEPÓSITO <span className="text-brand">EMMANUEL</span>
      </span>
    </div>
  );
}
