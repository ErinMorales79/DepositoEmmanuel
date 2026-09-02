import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useApi } from "../lib/useApi";
import type { Resumen } from "../lib/types";
import { q } from "../lib/format";
import { useTheme } from "../theme";
import BuscadorGlobal from "./BuscadorGlobal";
import Button from "./Button";
import Logo from "./Logo";
import StatPill from "./StatPill";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { usuario, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [buscar, setBuscar] = useState(false);
  const { data: resumen } = useApi<Resumen>("/resumen");

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscar(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  async function cerrarSesion() {
    setMenu(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="relative flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
      <button className="btn-icon lg:hidden" onClick={onMenu} aria-label="Abrir menú">
        <Menu size={18} />
      </button>

      <Logo />

      <div className="mx-1 hidden h-8 w-px bg-line 2xl:block" />

      {resumen && (
        <>
          <StatPill
            label="Ventas"
            value={q(resumen.ventas.total)}
            hint={`${resumen.ventas.count} operaciones`}
          />
          <StatPill
            label="Compras"
            value={q(resumen.compras.total)}
            hint={`${resumen.compras.count} facturas`}
          />
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          className="btn-icon"
          onClick={toggle}
          aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="btn-icon"
          aria-label="Buscar en el sistema"
          title="Buscar (Ctrl+K)"
          onClick={() => setBuscar(true)}
        >
          <Search size={18} />
        </button>

        <button className="btn-icon relative" aria-label="Notificaciones">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-pill bg-accent" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-2 rounded-pill border border-line bg-surface-1 py-1 pl-1 pr-2 transition hover:border-line-strong sm:pr-3"
          >
            <span className="grid h-8 w-8 place-items-center rounded-pill bg-accent text-[12px] font-bold text-accent-ink">
              {usuario?.iniciales ?? "··"}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[13px] font-semibold">
                {usuario?.nombre ?? "—"}
              </span>
              <span className="block text-[11px] text-ink-3">{usuario?.rol ?? ""}</span>
            </span>
            <ChevronDown size={15} className="hidden text-ink-3 sm:block" />
          </button>

          {menu && (
            <>
              <button
                className="fixed inset-0 z-40 cursor-default"
                aria-hidden
                onClick={() => setMenu(false)}
              />
              <div className="animate-fade-up absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-control border border-line bg-surface-1 p-1 shadow-card">
                <div className="px-3 py-2">
                  <div className="text-[13px] font-semibold">{usuario?.nombre}</div>
                  <div className="text-[11px] text-ink-3">{usuario?.email}</div>
                </div>
                <div className="my-1 h-px bg-line" />
                {usuario?.modulos.includes("configuracion") && (
                  <Link
                    to="/configuracion"
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13px] font-semibold text-ink-2 transition hover:bg-surface-2 hover:text-ink-1"
                  >
                    <Settings size={15} /> Configuración
                  </Link>
                )}
                <button
                  onClick={cerrarSesion}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2 text-left text-[13px] font-semibold text-neg transition hover:bg-neg/10"
                >
                  <LogOut size={15} /> Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>

        {usuario?.modulos.includes("ventas") && (
          <Button
            variant="primary"
            icon={<Plus size={16} strokeWidth={2.5} />}
            onClick={() => navigate("/ventas/nueva")}
            className="hidden md:inline-flex"
          >
            <span className="hidden lg:inline">Nueva venta</span>
          </Button>
        )}
      </div>

      <BuscadorGlobal open={buscar} onClose={() => setBuscar(false)} />
    </header>
  );
}
