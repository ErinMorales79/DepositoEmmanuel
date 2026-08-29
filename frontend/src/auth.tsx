import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "./lib/api";
import type { Usuario } from "./lib/types";

interface AuthValue {
  usuario: Usuario | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  usuario: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ usuario: Usuario }>("/auth/me")
      .then((r) => setUsuario(r.usuario))
      .catch((e: unknown) => {
        if (!(e instanceof ApiError)) console.error(e);
        setUsuario(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api.post<{ usuario: Usuario }>("/auth/login", {
      username,
      password,
    });
    setUsuario(r.usuario);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* da igual si falla */
    }
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
