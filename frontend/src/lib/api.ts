const BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (res.status === 401) {
    // se perdio la sesion, manda al login (menos si ya estamos ahi)
    if (
      !location.pathname.startsWith("/login") &&
      !path.startsWith("/auth/me")
    ) {
      location.assign("/login");
    }
    throw new ApiError(401, "No autenticado");
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo */
  }

  if (!res.ok) {
    const d = data as { detail?: string; error?: string } | null;
    throw new ApiError(res.status, d?.detail || d?.error || `Error ${res.status}`);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => req<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string) => req<T>(path, { method: "PATCH" }),
  delete: <T>(path: string) => req<T>(path, { method: "DELETE" }),
};
