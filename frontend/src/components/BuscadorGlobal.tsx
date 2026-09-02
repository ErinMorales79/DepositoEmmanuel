import {
  BarChart3,
  Boxes,
  LayoutGrid,
  Loader2,
  Package,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import type { Cliente, Producto } from "../lib/types";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";

type Resultado = {
  tipo: "Módulo" | "Cliente" | "Producto";
  label: string;
  sub?: string;
  icon: LucideIcon;
  accion: () => void;
};

const MODULOS: { modulo: string; label: string; to: string; icon: LucideIcon }[] = [
  { modulo: "dashboard", label: "Dashboard", to: "/", icon: LayoutGrid },
  { modulo: "productos", label: "Productos", to: "/productos", icon: Package },
  { modulo: "stock", label: "Stock", to: "/stock", icon: Boxes },
  { modulo: "compras", label: "Compras", to: "/compras", icon: ShoppingCart },
  { modulo: "ventas", label: "Ventas", to: "/ventas", icon: ReceiptText },
  { modulo: "ventas", label: "Nueva venta", to: "/ventas/nueva", icon: ReceiptText },
  { modulo: "clientes", label: "Clientes", to: "/clientes", icon: Users },
  { modulo: "distribucion", label: "Distribución", to: "/distribucion", icon: Truck },
  { modulo: "reportes", label: "Reportes de ventas", to: "/reportes/ventas", icon: BarChart3 },
  { modulo: "reportes", label: "Reportes de compras", to: "/reportes/compras", icon: BarChart3 },
  { modulo: "reportes", label: "Reportes de rutas", to: "/reportes/rutas", icon: BarChart3 },
  { modulo: "configuracion", label: "Configuración", to: "/configuracion", icon: Settings },
];

export default function BuscadorGlobal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const mods = usuario?.modulos ?? [];

  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  const puedeClientes = mods.includes("clientes");
  const puedeProductos = mods.includes("productos") || mods.includes("stock");

  const clientes = useApi<Cliente[]>(open && puedeClientes ? "/clientes" : null);
  const productos = useApi<Producto[]>(open && puedeProductos ? "/productos" : null);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
    }
  }, [open]);

  const resultados = useMemo<Resultado[]>(() => {
    const t = q.toLowerCase().trim();
    const out: Resultado[] = [];

    MODULOS.filter((m) => mods.includes(m.modulo))
      .filter((m) => !t || m.label.toLowerCase().includes(t))
      .forEach((m) =>
        out.push({
          tipo: "Módulo",
          label: m.label,
          icon: m.icon,
          accion: () => {
            navigate(m.to);
            onClose();
          },
        }),
      );

    if (t) {
      (clientes.data ?? [])
        .filter(
          (c) => c.nombre.toLowerCase().includes(t) || c.telefono.includes(t),
        )
        .slice(0, 6)
        .forEach((c) =>
          out.push({
            tipo: "Cliente",
            label: c.nombre,
            sub: c.telefono ? `Tel. ${c.telefono}` : c.direccion,
            icon: Users,
            accion: () => {
              navigate(`/clientes?q=${encodeURIComponent(c.nombre)}`);
              onClose();
            },
          }),
        );

      (productos.data ?? [])
        .filter(
          (p) =>
            p.nombre.toLowerCase().includes(t) || p.codigo_barra.includes(t),
        )
        .slice(0, 6)
        .forEach((p) =>
          out.push({
            tipo: "Producto",
            label: p.nombre,
            sub: `${p.marca} · Q ${money(p.precio_venta)} · stock ${p.stock}`,
            icon: Package,
            accion: () => {
              const dest = mods.includes("productos") ? "/productos" : "/stock";
              navigate(`${dest}?q=${encodeURIComponent(p.nombre)}`);
              onClose();
            },
          }),
        );
    }

    return out;
  }, [q, mods, clientes.data, productos.data, navigate, onClose]);

  useEffect(() => {
    setSel(0);
  }, [q]);

  if (!open) return null;

  const cargando = clientes.loading || productos.loading;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Cerrar buscador"
        onClick={onClose}
      />
      <div className="animate-fade-up relative w-full max-w-[560px] overflow-hidden rounded-card border border-line-strong bg-surface-1 shadow-glow">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-ink-3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, resultados.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                resultados[sel]?.accion();
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Buscar módulos, clientes, productos…"
            className="h-12 flex-1 bg-transparent text-sm text-ink-1 outline-none placeholder:text-ink-3"
          />
          {cargando && <Loader2 size={15} className="animate-spin text-ink-3" />}
          <button
            className="btn-icon h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {resultados.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-ink-3">
              {q ? "Sin resultados." : "Escribe para buscar."}
            </div>
          ) : (
            resultados.map((r, i) => {
              const Icon = r.icon;
              return (
                <button
                  key={`${r.tipo}-${r.label}-${i}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={r.accion}
                  className={`flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition ${
                    i === sel ? "bg-surface-2" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-surface-2 text-ink-2">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">
                      {r.label}
                    </span>
                    {r.sub && (
                      <span className="block truncate text-[11px] text-ink-3">
                        {r.sub}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-label text-ink-3">
                    {r.tipo}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-line px-4 py-2 text-[11px] text-ink-3">
          ↑↓ para moverte · Enter para abrir · Esc para cerrar
        </div>
      </div>
    </div>
  );
}
