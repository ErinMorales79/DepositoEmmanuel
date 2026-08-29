import { Loader2, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Field, Input } from "../components/Field";
import Logo from "../components/Logo";
import { useTheme } from "../theme";

export default function Login() {
  const navigate = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const { theme, toggle } = useTheme();
  const { usuario, loading, login } = useAuth();

  const [username, setUsername] = useState("admin@depositoemmanuel.com.gt");
  const [password, setPassword] = useState("Admin123");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const destino = loc.state?.from && loc.state.from !== "/login" ? loc.state.from : "/";

  // Ya hay sesión → adentro
  useEffect(() => {
    if (!loading && usuario) navigate(destino, { replace: true });
  }, [loading, usuario, navigate, destino]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(username.trim(), password);
      navigate(destino, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
      setEnviando(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-app p-4">
      <button
        className="btn-icon absolute right-4 top-4"
        onClick={toggle}
        aria-label="Cambiar tema"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-bold">Iniciar sesión</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Sistema de gestión · Depósito Emmanuel
          </p>

          {error && (
            <div className="mt-4 rounded-control border border-neg/30 bg-neg/10 px-3 py-2 text-[13px] font-medium text-neg">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-3" onSubmit={submit}>
            <Field label="Correo o usuario">
              <Input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-1 w-full"
              disabled={enviando}
            >
              {enviando ? <Loader2 size={16} className="animate-spin" /> : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-3">
          Usuario de prueba: admin@depositoemmanuel.com.gt / Admin123
        </p>
      </div>
    </div>
  );
}
