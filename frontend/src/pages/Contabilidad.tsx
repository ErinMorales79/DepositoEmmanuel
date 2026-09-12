import {
  Boxes,
  Calculator,
  Landmark,
  Pencil,
  PiggyBank,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import Card from "../components/Card";
import { Field, Input } from "../components/Field";
import GastoForm from "../components/GastoForm";
import PageHeader from "../components/PageHeader";
import { Async } from "../components/State";
import StatCard from "../components/StatCard";
import Tag from "../components/Tag";
import { useAuth } from "../auth";
import { api } from "../lib/api";
import { isoHoy, isoInicioMes } from "../data/helpers";
import { money } from "../lib/format";
import type {
  ContabilidadResumen,
  Gasto,
  LibroVentas,
  MargenProducto,
} from "../lib/types";
import { useApi } from "../lib/useApi";

type Tab = "resumen" | "gastos" | "margenes" | "libro";

const TABS: { to: Tab; label: string }[] = [
  { to: "resumen", label: "Resumen" },
  { to: "gastos", label: "Gastos" },
  { to: "margenes", label: "Márgenes por producto" },
  { to: "libro", label: "Libro de ventas" },
];

function DateRangeBar({
  desde,
  hasta,
  setDesde,
  setHasta,
  onReset,
}: {
  desde: string;
  hasta: string;
  setDesde: (v: string) => void;
  setHasta: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <Card bodyClass="p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Desde">
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Field>
        <Field label="Hasta">
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Field>
        <button className="btn h-10" onClick={onReset}>
          <RotateCcw size={15} /> Este mes
        </button>
      </div>
    </Card>
  );
}

// ============================================================
// RESUMEN — responde las 7 preguntas de la propietaria
// ============================================================
function ResumenTab({ qs }: { qs: string }) {
  const q = useApi<ContabilidadResumen>(`/contabilidad/resumen?${qs}`);

  return (
    <Async q={q}>
      {(d) => (
        <div className="space-y-4">
          <div className="rounded-control border border-line bg-surface-1 px-4 py-3 text-[13px] text-ink-2">
            Régimen: <span className="font-semibold text-ink-1">Pequeño Contribuyente</span> —
            la SAT cobra un <span className="font-semibold text-ink-1">5% fijo sobre el total vendido</span>,
            sin importar el margen real de cada producto.
          </div>

          <div>
            <div className="label mb-2">Lo que entró y lo que costó</div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total vendido"
                value={`Q ${money(d.ventas.total)}`}
                hint={`${d.ventas.count} venta(s) en el rango`}
                icon={ReceiptText}
                tone="accent"
              />
              <StatCard
                label="Inversión (compras)"
                value={`Q ${money(d.compras.total)}`}
                hint={`${d.compras.count} compra(s) — repone bodega`}
                icon={ShoppingCart}
              />
              <StatCard
                label="Costo de lo vendido"
                value={`Q ${money(d.costo_vendido)}`}
                hint="al precio de compra de cada producto"
                icon={Boxes}
              />
              <StatCard
                label="Ganancia bruta"
                value={`Q ${money(d.ganancia_bruta)}`}
                hint={`${d.margen_bruto_pct}% sobre venta`}
                icon={TrendingUp}
                tone="accent"
              />
            </div>
          </div>

          <div>
            <div className="label mb-2">Gastos, impuesto y lo que realmente queda</div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Gastos operativos"
                value={`Q ${money(d.gastos_operativos)}`}
                hint={`${d.gastos_count} registrado(s) — alquiler, sueldos, servicios…`}
                icon={Wallet}
              />
              <StatCard
                label="Utilidad operativa"
                value={`Q ${money(d.utilidad_operativa)}`}
                hint="ganancia bruta − gastos (antes de SAT)"
                icon={Calculator}
              />
              <StatCard
                label="Impuesto a la SAT"
                value={`Q ${money(d.impuesto_sat)}`}
                hint={`${(d.tasa_sat * 100).toFixed(0)}% del total vendido`}
                icon={Landmark}
                tone="warn"
              />
              <StatCard
                label="Utilidad neta"
                value={`Q ${money(d.utilidad_neta)}`}
                hint={`${d.margen_neto_pct}% neto sobre venta`}
                icon={PiggyBank}
                tone="accent"
              />
            </div>
          </div>
        </div>
      )}
    </Async>
  );
}

// ============================================================
// GASTOS — solo Admin escribe, Contador solo consulta
// ============================================================
const CATEGORIA_LABEL: Record<string, string> = {
  ALQUILER: "Alquiler",
  SUELDOS: "Sueldos",
  COMBUSTIBLE: "Combustible",
  LUZ: "Luz",
  AGUA: "Agua",
  OTRO: "Otro",
};

function GastosTab({ qs }: { qs: string }) {
  const { usuario } = useAuth();
  const soloLectura = (usuario?.solo_lectura ?? []).includes("contabilidad");

  const lista = useApi<Gasto[]>(`/contabilidad/gastos?${qs}`);
  const [editando, setEditando] = useState<Gasto | null>(null);

  function onSaved() {
    setEditando(null);
    lista.reload();
  }

  async function eliminar(g: Gasto) {
    if (!confirm(`¿Eliminar el gasto "${g.descripcion}"?`)) return;
    const r = await api.delete<{ ok?: boolean; error?: string }>(`/contabilidad/gastos/${g.id}`);
    if (r.error) {
      alert(r.error);
      return;
    }
    if (editando?.id === g.id) setEditando(null);
    lista.reload();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Async q={lista}>
        {(gastos) => (
          <Card bodyClass="p-0">
            {gastos.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-3">
                Sin gastos registrados en el rango.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                      <th className="px-4 py-2.5 font-semibold">Fecha</th>
                      <th className="px-4 py-2.5 font-semibold">Categoría</th>
                      <th className="px-4 py-2.5 font-semibold">Descripción</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Monto</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((g) => (
                      <tr key={g.id} className="border-t border-line row-hover">
                        <td className="px-4 py-3 text-ink-2">{g.fecha}</td>
                        <td className="px-4 py-3">
                          <Tag>{CATEGORIA_LABEL[g.categoria] ?? g.categoria}</Tag>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{g.descripcion}</div>
                          {g.numero_factura && (
                            <div className="text-[11px] text-ink-3">Factura {g.numero_factura}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tnum font-bold">
                          Q {money(g.monto)}
                        </td>
                        <td className="px-4 py-3">
                          {!soloLectura && (
                            <div className="flex justify-end gap-1">
                              <button
                                className="btn-icon h-8 w-8"
                                aria-label="Editar"
                                onClick={() => setEditando(g)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="btn-icon h-8 w-8 text-neg"
                                aria-label="Eliminar"
                                onClick={() => eliminar(g)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </Async>

      <Card title={editando ? `Editar gasto #${editando.id}` : "Nuevo gasto"} bodyClass="p-5 pt-4">
        <GastoForm
          editando={editando}
          onSaved={onSaved}
          onCancel={() => setEditando(null)}
          soloLectura={soloLectura}
        />
      </Card>
    </div>
  );
}

// ============================================================
// MÁRGENES POR PRODUCTO (catálogo completo)
// ============================================================
function MargenesTab() {
  const q = useApi<MargenProducto[]>("/contabilidad/productos");

  return (
    <Async q={q}>
      {(productos) => (
        <Card bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                  <th className="px-4 py-2.5 font-semibold">Producto</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Precio compra</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Precio venta</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ganancia (Q)</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Margen sobre venta</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className="border-t border-line row-hover">
                    <td className="px-4 py-3 font-semibold">{p.nombre}</td>
                    <td className="px-4 py-3 text-right tnum text-ink-2">
                      Q {money(p.precio_compra)}
                    </td>
                    <td className="px-4 py-3 text-right tnum text-ink-2">
                      Q {money(p.precio_venta)}
                    </td>
                    <td className="px-4 py-3 text-right tnum">Q {money(p.ganancia_unitaria)}</td>
                    <td className="px-4 py-3 text-right">
                      <Tag tone={p.margen_pct >= 20 ? "pos" : p.margen_pct >= 10 ? "accent" : "warn"}>
                        {p.margen_pct}%
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Async>
  );
}

// ============================================================
// LIBRO DE VENTAS (el reporte que pide la contadora)
// ============================================================
function LibroVentasTab({ qs }: { qs: string }) {
  const q = useApi<LibroVentas>(`/contabilidad/libro-ventas?${qs}`);

  return (
    <Async q={q}>
      {(d) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Ventas en el rango" value={d.resumen.count} />
            <StatCard label="Total vendido" value={`Q ${money(d.resumen.total)}`} tone="accent" />
            <StatCard label="Impuesto SAT (5%)" value={`Q ${money(d.resumen.impuesto)}`} tone="warn" />
          </div>

          <Card bodyClass="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                    <th className="px-4 py-2.5 font-semibold">#</th>
                    <th className="px-4 py-2.5 font-semibold">Fecha</th>
                    <th className="px-4 py-2.5 font-semibold">Cliente</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Canal</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Impuesto 5%</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-3">
                        Sin ventas finalizadas en el rango.
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
                        <td className="px-4 py-3 text-right tnum font-bold">Q {money(v.total)}</td>
                        <td className="px-4 py-3 text-right tnum text-ink-2">Q {money(v.impuesto)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </Async>
  );
}

// ============================================================
export default function Contabilidad() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [desde, setDesde] = useState(isoInicioMes());
  const [hasta, setHasta] = useState(isoHoy());
  const qs = `desde=${desde}&hasta=${hasta}`;

  function reset() {
    setDesde(isoInicioMes());
    setHasta(isoHoy());
  }

  return (
    <div>
      <PageHeader
        title="Contabilidad"
        subtitle="Impuesto SAT, ganancia bruta y neta, márgenes y gastos del negocio"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(({ to, label }) => (
          <button
            key={to}
            onClick={() => setTab(to)}
            className={`chip h-9 ${tab === to ? "chip-active" : "hover:text-ink-1"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== "margenes" && (
        <div className="mb-4">
          <DateRangeBar desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} onReset={reset} />
        </div>
      )}

      {tab === "resumen" && <ResumenTab qs={qs} />}
      {tab === "gastos" && <GastosTab qs={qs} />}
      {tab === "margenes" && <MargenesTab />}
      {tab === "libro" && <LibroVentasTab qs={qs} />}
    </div>
  );
}
