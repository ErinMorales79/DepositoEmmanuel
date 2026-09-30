import { Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-3">
      <Loader2 size={18} className="animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <TriangleAlert size={22} className="text-neg" />
      <div className="text-sm text-ink-2">{message}</div>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

// segun como vaya useApi, muestra el spinner, el error, o los datos ya listos
export function Async<T>({
  q,
  children,
}: {
  q: { data: T | null; loading: boolean; error: string | null; reload: () => void };
  children: (data: T) => ReactNode;
}) {
  if (q.loading && !q.data) return <Spinner />;
  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  if (!q.data) return null;
  return <>{children(q.data)}</>;
}
