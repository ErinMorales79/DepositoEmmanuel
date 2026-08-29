interface Bar {
  label: string;
  value: number;
}

/** Gráfica de barras compacta, sin dependencias. Para los reportes. */
export default function MiniBars({
  data,
  height = 140,
  format = (n: number) => String(n),
}: {
  data: Bar[];
  height?: number;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => {
        const h = Math.max(3, Math.round((d.value / max) * (height - 26)));
        return (
          <div
            key={d.label}
            className="group flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex w-full flex-1 items-end justify-center">
              <span className="pointer-events-none absolute -top-1 whitespace-nowrap rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold tnum text-ink-2 opacity-0 transition group-hover:opacity-100">
                {format(d.value)}
              </span>
              <div
                className="w-full max-w-[38px] rounded-md bg-accent/25 transition group-hover:bg-accent/45"
                style={{ height: h }}
              />
            </div>
            <span className="truncate text-[10px] font-medium uppercase tracking-label text-ink-3">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
