import {
  Boxes,
  LayoutGrid,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

type Item = { to: string; label: string; icon: LucideIcon; modulo: string; end?: boolean };

const operacion: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, modulo: "dashboard", end: true },
  { to: "/productos", label: "Productos", icon: Package, modulo: "productos" },
  { to: "/stock", label: "Stock", icon: Boxes, modulo: "stock" },
  { to: "/compras", label: "Compras", icon: ShoppingCart, modulo: "compras" },
  { to: "/ventas", label: "Ventas", icon: ReceiptText, modulo: "ventas" },
  { to: "/clientes", label: "Clientes", icon: Users, modulo: "clientes" },
  { to: "/distribucion", label: "Distribución", icon: Truck, modulo: "distribucion" },
];

const reportes: Item[] = [
  { to: "/reportes/ventas", label: "Ventas", icon: ReceiptText, modulo: "reportes" },
  { to: "/reportes/compras", label: "Compras", icon: ShoppingCart, modulo: "reportes" },
  { to: "/reportes/rutas", label: "Rutas", icon: Truck, modulo: "reportes" },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const modulos = usuario?.modulos ?? [];

  const tieneReportes = modulos.includes("reportes");
  const enReportes = tieneReportes && loc.pathname.startsWith("/reportes");
  const items = (enReportes ? reportes : operacion).filter((i) => modulos.includes(i.modulo));

  async function cerrarSesion() {
    onNavigate?.();
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      {tieneReportes && (
        <div className="mb-3 flex rounded-control border border-line bg-surface-1 p-1 text-[13px] font-semibold">
          <button
            onClick={() => navigate("/")}
            className={`flex-1 rounded-[9px] py-1.5 text-center transition ${
              enReportes ? "text-ink-3 hover:text-ink-2" : "bg-surface-2 text-ink-1"
            }`}
          >
            Operación
          </button>
          <button
            onClick={() => navigate("/reportes/ventas")}
            className={`flex-1 rounded-[9px] py-1.5 text-center transition ${
              enReportes ? "bg-surface-2 text-ink-1" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            Reportes
          </button>
        </div>
      )}

      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <Icon size={18} strokeWidth={1.75} className={isActive ? "text-brand" : ""} />
              {label}
            </>
          )}
        </NavLink>
      ))}

      <div className="my-2 h-px bg-line" />

      {modulos.includes("configuracion") && (
        <NavLink
          to="/configuracion"
          onClick={onNavigate}
          className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
        >
          <Settings size={18} strokeWidth={1.75} />
          Configuración
        </NavLink>
      )}

      <button onClick={cerrarSesion} className="nav-item text-left hover:text-neg">
        <LogOut size={18} strokeWidth={1.75} />
        Cerrar sesión
      </button>

      <div className="mt-auto px-2 pt-6 text-[11px] text-ink-3">
        Depósito Emmanuel · v1.0
      </div>
    </nav>
  );
}
