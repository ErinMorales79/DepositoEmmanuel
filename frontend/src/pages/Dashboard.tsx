import { AlertTriangle, Bike, Boxes, LogOut, Package, Truck, Warehouse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { Async } from "../components/State";
import Tag from "../components/Tag";
import { fechaLarga, saludo } from "../data/helpers";
import { useApi } from "../lib/useApi";
import type { DashboardData } from "../lib/types";
import { int } from "../lib/format";

const ubicIcon: Record<string, typeof Warehouse> = {
  BODEGA: Warehouse,
  CAMION: Truck,
  MOTO: Bike,
};

const negativos = new Set(["SALIDA", "ANULACION"]);

export default function Dashboard() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const q = useApi<DashboardData>("/dashboard");

  async function cerrarSesion() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-control bg-accent font-display text-lg font-bold text-accent-ink">
            {usuario?.iniciales ?? "··"}
          </div>
          <div>
            <div className="label">
              {saludo()} · {fechaLarga()}
            </div>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">
              Bienvenido, {usuario?.nombre ?? ""}
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-2">
              <Tag tone="accent">{usuario?.rol ?? ""}</Tag>
              <span>{usuario?.handle}</span>
            </div>
          </div>
        </div>
        <button className="btn" onClick={cerrarSesion}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </section>

      <Async q={q}>
        {(d) => {
          const rutaAbierta = d.ruta_activa?.estado === "ABIERTA";
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Productos activos"
                  value={d.productos_activos}
                  icon={Package}
                  to="/productos"
                  hint={`${d.productos_total} en catálogo`}
                />
                <StatCard
                  label="Unidades en bodega"
                  value={int(d.unidades_bodega)}
                  icon={Boxes}
                  to="/stock"
                  hint="Existencia total"
                />
                <StatCard
                  label="Bajo stock mínimo"
                  value={d.bajo_minimo.length}
                  icon={AlertTriangle}
                  to="/stock"
                  tone={d.bajo_minimo.length ? "warn" : "default"}
                  hint={d.bajo_minimo.length ? "Requieren compra" : "Todo en nivel"}
                />
                <StatCard
                  label="Ruta activa"
                  value={rutaAbierta ? d.ruta_activa!.correlativo : "Ninguna"}
                  icon={Truck}
                  to="/distribucion"
                  tone={rutaAbierta ? "accent" : "default"}
                  hint={rutaAbierta ? d.ruta_activa!.piloto : "Sin ruta abierta"}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Actividad reciente" bodyClass="p-2">
                  {d.movimientos.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-ink-3">
                      Sin movimientos registrados.
                    </div>
                  ) : (
                    d.movimientos.map((m, i) => {
                      const neg = negativos.has(m.tipo);
                      return (
                        <div
                          key={i}
                          className="row-hover flex items-center gap-3 rounded-control px-3 py-2.5"
                        >
                          <div className="w-9 shrink-0 text-[12px] font-semibold tnum text-ink-3">
                            {m.hora}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold">
                              {m.producto}
                            </div>
                            <div className="text-[11px] text-ink-3">
                              {m.fecha} · {m.tipo} · {m.referencia}
                            </div>
                          </div>
                          <div
                            className={`text-[13px] font-bold tnum ${
                              neg ? "text-neg" : "text-pos"
                            }`}
                          >
                            {neg ? "−" : "+"}
                            {m.cantidad}
                          </div>
                        </div>
                      );
                    })
                  )}
                </Card>

                <Card
                  title="Alertas de stock"
                  action={
                    <span className="text-[12px] font-semibold text-ink-3">
                      {d.bajo_minimo.length} productos
                    </span>
                  }
                  bodyClass="p-2"
                >
                  {d.bajo_minimo.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-ink-3">
                      Sin alertas. Todo por encima del mínimo.
                    </div>
                  ) : (
                    d.bajo_minimo.map((p) => (
                      <div
                        key={p.id}
                        className="row-hover flex items-center gap-3 rounded-control px-3 py-2.5"
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-amber-400/10 text-amber-600 dark:text-amber-400">
                          <AlertTriangle size={14} />
                        </div>
                        <div className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                          {p.nombre}
                        </div>
                        <div className="whitespace-nowrap text-right text-[12px]">
                          <span className="font-bold tnum text-neg">{p.stock}</span>
                          <span className="text-ink-3"> / mín {p.minimo}</span>
                        </div>
                      </div>
                    ))
                  )}
                </Card>

                <Card title="Stock por ubicación" bodyClass="p-2">
                  {d.ubicaciones.map((u) => {
                    const Icon = ubicIcon[u.nombre] ?? Warehouse;
                    return (
                      <div
                        key={u.nombre}
                        className="row-hover flex items-center gap-3 rounded-control px-3 py-3"
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-surface-2 text-brand">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold">{u.nombre}</div>
                          <div className="truncate text-[11px] text-ink-3">{u.nota}</div>
                        </div>
                        <div className="font-display text-sm font-bold tnum">
                          {int(u.unidades)}
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}
