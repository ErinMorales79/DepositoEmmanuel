import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** GET a un endpoint con estado de carga/error y recarga manual. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: path != null,
    error: null,
  });

  const load = useCallback(() => {
    if (path == null) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get<T>(path)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) return; // ya redirige api.ts
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "Error de conexión",
        }));
      });
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
