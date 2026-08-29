import { ReceiptText, RotateCcw, ShoppingCart, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import Card from "../components/Card";
import { Field, Select } from "../components/Field";
import MiniBars from "../components/MiniBars";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { Async } from "../components/State";
import Tag from "../components/Tag";
import { isoHace, isoHoy } from "../data/helpers";
import type {
  Catalogos,
  ReporteCompras,
  ReporteRutas,
  ReporteVentas,
} from "../lib/types";
import { int, money } from "../lib/format";
import { useApi } from "../lib/useApi";

type Tipo = "ventas" | "compras" | "rutas";

const tabs: { to: Tipo; label: string; icon: typeof Truck }[] = [
  { to: "ventas", label: "Ventas", icon: ReceiptText },
  { to: "compras", label: "Compras", icon: ShoppingCart },
  { to: "rutas", label: "Rutas", icon: Truck },
];

const DEFAULT_DESDE = isoHace(120);
const DEFAULT_HASTA = isoHoy();

function useFiltros<E extends Record<string, string>>(extra: E) {
  type F = { desde: string; hasta: string } & E;
  const inicial = () =>
    ({ desde: DEFAULT_DESDE, hasta: DEFAULT_HASTA, ...extra }) as F;
  const [f, setF] = useState<F>(inicial);
  const set = (k: keyof F, v: string) => setF((p) => ({ ...p, [k]: v }));
  const reset = () => setF(inicial());
  const qs = new URLSearchParams(f).toString();
  return { f, set, reset, qs };
}

function DateRange({
  f,
  set,
}: {
  f: { desde: string; hasta: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (k: any, v: string) => void;
}) {
  return (
    <>
      <Field label="Desde">
        <input
          type="date"
          value={f.desde}
          onChange={(e) => set("desde", e.target.value)}
          className="field-input"
        />
      </Field>
      <Field label="Hasta">
        <input
          type="date"
          value={f.hasta}
          onChange={(e) => set("hasta", e.target.value)}
          className="field-input"
        />
      </Field>
    </>
  );
}

function FilterBar({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset: () => void;
}) {
  return (
    <Card bodyClass="p-4">
      <div className="flex flex-wrap items-end gap-3">
        {children}
        <button className="btn h-10" onClick={onReset}>
          <RotateCcw size={15} /> Limpiar
        </button>
      </div>
    </Card>
  );
}

function DataTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <Card bodyClass="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] whitespace-nowrap text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
              {head}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

const estadoTone = { FINALIZADA: "pos", ACTIVA: "accent", ANULADA: "neg" } as const;

// --- Ventas ---------------------------------------------------------------

function ReporteVentasView({ cat }: { cat: Catalogos }) {
  const { f, set, reset, qs } = useFiltros({
    cliente: "Todos",
    canal: "Todos",
    estado: "Todos",
  });
  const q = useApi<ReporteVentas>(`/reportes/ventas?${qs}`);

  return (
    <div className="space-y-4">
      <FilterBar onReset={reset}>
        <DateRange f={f} set={set} />
        <Field label="Cliente">
          <Select value={f.cliente} onChange={(e) => set("cliente", e.target.value)}>
            <option>Todos</option>
            {cat.clientes.map((c) => (
              <option key={c.id}>{c.nombre}</option>
            ))}
          </Select>
        </Field>
        <Field label="Canal">
          <Select value={f.canal} onChange={(e) => set("canal", e.target.value)}>
            <option>Todos</option>
            <option>MOSTRADOR</option>
            <option>CAMION</option>
            <option>MOTO</option>
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={f.estado} onChange={(e) => set("estado", e.target.value)}>
            <option>Todos</option>
            <option>FINALIZADA</option>
            <option>ANULADA</option>
            <option>ACTIVA</option>
          </Select>
        </Field>
      </FilterBar>

      <Async q={q}>
        {(d) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Ventas" value={d.resumen.count} hint="en el rango" />
              <StatCard
                label="Total vendido"
                value={`Q ${money(d.resumen.total_finalizado)}`}
                hint="solo finalizadas"
                tone="accent"
              />
              <StatCard
                label="Ticket promedio"
                value={`Q ${money(d.resumen.ticket_promedio)}`}
              />
              <StatCard
                label="Anuladas"
                value={d.resumen.anuladas}
                tone={d.resumen.anuladas ? "warn" : "default"}
              />
            </div>

            {d.por_dia.length > 0 && (
              <Card title="Ventas por día" bodyClass="p-5 pt-4">
                <MiniBars data={d.por_dia} format={(n) => `Q ${int(n)}`} />
              </Card>
            )}

            <DataTable
              head={
                <>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-center font-semibold">Canal</th>
                  <th className="px-4 py-3 text-center font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </>
              }
            >
              {d.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-3">
                    Sin ventas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                d.rows.map((v) => (
                  <tr key={v.id} className="border-t border-line row-hover">
                    <td className="px-4 py-3 tnum text-ink-3">{v.id}</td>
                    <td className="px-4 py-3 text-ink-2">{v.fecha}</td>
                    <td className="px-4 py-3 font-semibold">{v.cliente}</td>
                    <td className="px-4 py-3 text-center">
                      <Tag>{v.canal}</Tag>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Tag tone={estadoTone[v.estado]}>{v.estado}</Tag>
                    </td>
                    <td className="px-4 py-3 text-right tnum font-bold">
                      Q {money(v.total)}
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          </>
        )}
      </Async>
    </div>
  );
}

// --- Compras -------------------------------------------------------------

function ReporteComprasView({ cat }: { cat: Catalogos }) {
  const { f, set, reset, qs } = useFiltros({ proveedor: "Todos", estado: "Todos" });
  const q = useApi<ReporteCompras>(`/reportes/compras?${qs}`);

  return (
    <div className="space-y-4">
      <FilterBar onReset={reset}>
        <DateRange f={f} set={set} />
        <Field label="Proveedor">
          <Select
            value={f.proveedor}
            onChange={(e) => set("proveedor", e.target.value)}
          >
            <option>Todos</option>
            {cat.proveedores.map((p) => (
              <option key={p.id}>{p.nombre}</option>
            ))}
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={f.estado} onChange={(e) => set("estado", e.target.value)}>
            <option>Todos</option>
            <option>FINALIZADA</option>
            <option>BORRADOR</option>
          </Select>
        </Field>
      </FilterBar>

      <Async q={q}>
        {(d) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Compras" value={d.resumen.count} hint="en el rango" />
              <StatCard
                label="Total comprado"
                value={`Q ${money(d.resumen.total)}`}
                tone="accent"
              />
              <StatCard
                label="Promedio por compra"
                value={`Q ${money(d.resumen.promedio)}`}
              />
              <StatCard label="Proveedores" value={d.resumen.proveedores} hint="distintos" />
            </div>

            {d.por_dia.length > 0 && (
              <Card title="Compras por día" bodyClass="p-5 pt-4">
                <MiniBars data={d.por_dia} format={(n) => `Q ${int(n)}`} />
              </Card>
            )}

            <DataTable
              head={
                <>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Proveedor</th>
                  <th className="px-4 py-3 font-semibold">Factura</th>
                  <th className="px-4 py-3 text-center font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </>
              }
            >
              {d.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-3">
                    Sin compras para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                d.rows.map((c) => (
                  <tr key={c.id} className="border-t border-line row-hover">
                    <td className="px-4 py-3 tnum text-ink-3">{c.id}</td>
                    <td className="px-4 py-3 text-ink-2">{c.fecha}</td>
                    <td className="px-4 py-3 font-semibold">{c.proveedor}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-2">
                      {c.factura}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Tag tone={c.estado === "FINALIZADA" ? "pos" : "warn"}>
                        {c.estado}
                      </Tag>
                    </td>
                    <td className="px-4 py-3 text-right tnum font-bold">
                      Q {money(c.total)}
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          </>
        )}
      </Async>
    </div>
  );
}

// --- Rutas -------------------------------------------------------------

function ReporteRutasView() {
  const { f, set, reset, qs } = useFiltros({ estado: "Todos" });
  const q = useApi<ReporteRutas>(`/reportes/rutas?${qs}`);

  return (
    <div className="space-y-4">
      <FilterBar onReset={reset}>
        <DateRange f={f} set={set} />
        <Field label="Estado">
          <Select value={f.estado} onChange={(e) => set("estado", e.target.value)}>
            <option>Todos</option>
            <option>ABIERTA</option>
            <option>CERRADA</option>
          </Select>
        </Field>
      </FilterBar>

      <Async q={q}>
        {(d) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Rutas" value={d.resumen.count} hint="en el rango" />
              <StatCard label="Unidades vendidas" value={int(d.resumen.unidades)} />
              <StatCard
                label="Venta de ruta"
                value={`Q ${money(d.resumen.total_sistema)}`}
                tone="accent"
              />
              <StatCard
                label="Diferencia de caja"
                value={`Q ${money(d.resumen.diferencia)}`}
                tone={d.resumen.diferencia < 0 ? "warn" : "default"}
                hint="acumulada (cerradas)"
              />
            </div>

            <DataTable
              head={
                <>
                  <th className="px-4 py-3 font-semibold">Ruta</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Piloto</th>
                  <th className="px-4 py-3 text-center font-semibold">Salida</th>
                  <th className="px-4 py-3 text-center font-semibold">Vendidas</th>
                  <th className="px-4 py-3 text-right font-semibold">Sistema</th>
                  <th className="px-4 py-3 text-right font-semibold">Efectivo</th>
                  <th className="px-4 py-3 text-right font-semibold">Dif.</th>
                </>
              }
            >
              {d.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-3">
                    Sin rutas registradas en el rango. Cierra una ruta desde
                    Distribución para verla aquí.
                  </td>
                </tr>
              ) : (
                d.rows.map((r) => {
                  const dif = r.estado === "CERRADA" ? r.efectivo - r.totalSistema : null;
                  return (
                    <tr key={r.id} className="border-t border-line row-hover">
                      <td className="px-4 py-3">
                        <span className="font-semibold">{r.correlativo}</span>{" "}
                        {r.estado === "ABIERTA" && <Tag tone="accent">ABIERTA</Tag>}
                      </td>
                      <td className="px-4 py-3 text-ink-2">{r.fecha}</td>
                      <td className="px-4 py-3 font-semibold">{r.piloto}</td>
                      <td className="px-4 py-3 text-center tnum">{r.unidadesSalida}</td>
                      <td className="px-4 py-3 text-center tnum font-bold text-brand">
                        {r.unidadesVendidas}
                      </td>
                      <td className="px-4 py-3 text-right tnum">
                        Q {money(r.totalSistema)}
                      </td>
                      <td className="px-4 py-3 text-right tnum text-ink-2">
                        {r.estado === "CERRADA" ? `Q ${money(r.efectivo)}` : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tnum font-bold ${
                          dif == null ? "text-ink-3" : dif < 0 ? "text-neg" : "text-pos"
                        }`}
                      >
                        {dif == null ? "—" : `Q ${money(dif)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </DataTable>
          </>
        )}
      </Async>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function Reportes() {
  const { tipo } = useParams();
  const t: Tipo = (["ventas", "compras", "rutas"].includes(tipo ?? "")
    ? tipo
    : "ventas") as Tipo;
  const cat = useApi<Catalogos>("/catalogos");

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Consulta y filtra el histórico de operaciones"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`/reportes/${to}`}
            className={`chip h-9 ${t === to ? "chip-active" : "hover:text-ink-1"}`}
          >
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </div>

      {t === "rutas" ? (
        <ReporteRutasView />
      ) : (
        <Async q={cat}>
          {(c) =>
            t === "ventas" ? (
              <ReporteVentasView cat={c} />
            ) : (
              <ReporteComprasView cat={c} />
            )
          }
        </Async>
      )}
    </div>
  );
}
