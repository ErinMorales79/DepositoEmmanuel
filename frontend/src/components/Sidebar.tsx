import {
  Boxes,
  LayoutGrid,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean };

const operacion: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/productos", label: "Productos", icon: Package },
  { to: "/stock", label: "Stock", icon: Boxes },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/ventas", label: "Ventas", icon: ReceiptText },
  { to: "/distribucion", label: "Distribución", icon: Truck },
];

const reportes: Item[] = [
  { to: "/reportes/ventas", label: "Ventas", icon: ReceiptText },
  { to: "/reportes/compras", label: "Compras", icon: ShoppingCart },
  { to: "/reportes/rutas", label: "Rutas", icon: Truck },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const enReportes = loc.pathname.startsWith("/reportes");
  const items = enReportes ? reportes : operacion;

  async function cerrarSesion() {
    onNavigate?.();
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
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

      <NavLink
        to="/configuracion"
        onClick={onNavigate}
        className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
      >
        <Settings size={18} strokeWidth={1.75} />
        Configuración
      </NavLink>

      <button
        onClick={cerrarSesion}
        className="nav-item text-left hover:text-neg"
      >
        <LogOut size={18} strokeWidth={1.75} />
        Cerrar sesión
      </button>

      <div className="mt-auto px-2 pt-6 text-[11px] text-ink-3">
        Depósito Emmanuel · v1.0
      </div>
    </nav>
  );
}
