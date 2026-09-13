import { Check, Loader2, Plus, Truck, User } from "lucide-react";
import { useEffect, useState } from "react";
import Card from "../components/Card";
import { Field, Select } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { Async } from "../components/State";
import Tag from "../components/Tag";
import { api } from "../lib/api";
import type { DistribucionData, Producto } from "../lib/types";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";

export default function Distribucion() {
  const dist = useApi<DistribucionData>("/distribucion");
  const productos = useApi<Producto[]>("/productos");

  return (
    <div>
      <PageHeader title="Distribución" subtitle="Carga, ruta y cuadre de camión" />
      <Async q={dist}>
        {(d) =>
          d.ruta_activa ? (
            <RutaAbierta
              d={d}
              productos={(productos.data ?? []).filter((p) => p.activo)}
              reload={() => {
                dist.reload();
                productos.reload();
              }}
            />
          ) : (
            <SinRuta reload={dist.reload} />
          )
        }
      </Async>
    </div>
  );
}

function SinRuta({ reload }: { reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ ok?: boolean; error?: string }>(
        "/distribucion/abrir",
      );
      if (r.error) setError(r.error);
      else reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  return (
    <Card bodyClass="flex flex-col items-center gap-4 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-control bg-surface-2 text-ink-3">
        <Truck size={24} />
      </div>
      <div>
        <h3 className="text-[15px] font-semibold">No hay ruta abierta</h3>
        <p className="mt-1 text-sm text-ink-2">
          Abre una ruta para cargar el camión y registrar el reparto.
        </p>
      </div>
      {error && <p className="text-[13px] font-medium text-neg">{error}</p>}
      <button className="btn btn-primary" onClick={abrir} disabled={busy}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : "Abrir ruta"}
      </button>
    </Card>
  );
}

function RutaAbierta({
  d,
  productos,
  reload,
}: {
  d: DistribucionData;
  productos: Producto[];
  reload: () => void;
}) {
  const ruta = d.ruta_activa!;
  const [regresos, setRegresos] = useState<number[]>([]);
  const [efectivo, setEfectivo] = useState(0);
  const [prodId, setProdId] = useState(0);
  const [cantSalida, setCantSalida] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    setRegresos(d.detalle.map((x) => x.regreso));
  }, [d.detalle]);

  const filas = d.detalle.map((x, i) => {
    const regreso = Math.min(Math.max(regresos[i] ?? x.regreso, 0), x.salida);
    const vendido = x.salida - regreso;
    return { ...x, regreso, vendido, subtotal: vendido * x.precio };
  });
  const totalSistema = filas.reduce((a, f) => a + f.subtotal, 0);
  const diferencia = efectivo - totalSistema;

  async function cargar() {
    const p = productos.find((x) => x.id === prodId) ?? productos[0];
    if (!p || cantSalida <= 0) return;
    setCargando(true);
    setError(null);
    try {
      const r = await api.post<{ ok?: boolean; error?: string }>(
        "/distribucion/cargar",
        { producto_id: p.id, cantidad: cantSalida },
      );
      if (r.error) setError(r.error);
      else {
        setCantSalida(1);
        reload();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setCargando(false);
  }

  async function confirmar() {
    setConfirmando(true);
    setError(null);
    try {
      const r = await api.post<{ ok?: boolean; error?: string }>(
        "/distribucion/confirmar",
        {
          efectivo_total: efectivo,
          items: filas.map((f) => ({
            producto_id: f.producto_id,
            cantidad_regreso: f.regreso,
          })),
        },
      );
      if (r.error) {
        setError(r.error);
        setConfirmando(false);
      } else {
        reload();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setConfirmando(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-control border border-neg/30 bg-neg/10 px-3 py-2 text-[13px] font-medium text-neg">
          {error}
        </div>
      )}

      <Card bodyClass="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-control bg-accent text-accent-ink">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold">
                  {ruta.correlativo}
                </span>
                <Tag tone="accent">{ruta.estado}</Tag>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
                <User size={13} /> {ruta.piloto} · camión {ruta.camion}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="label">Fecha</div>
            <div className="font-display text-base font-bold tnum">{ruta.fecha}</div>
          </div>
        </div>
      </Card>

      <Card title="Cargar producto al camión" bodyClass="p-5 pt-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <Field label="Producto">
            <Select
              value={prodId || productos[0]?.id || 0}
              onChange={(e) => setProdId(Number(e.target.value))}
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · bodega {p.stock}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cantidad">
            <input
              type="number"
              min={1}
              value={cantSalida}
              onChange={(e) => setCantSalida(Number(e.target.value))}
              className="field-input"
            />
          </Field>
          <button className="btn h-10" onClick={cargar} disabled={cargando}>
            {cargando ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                <Plus size={15} strokeWidth={2.5} /> Cargar
              </>
            )}
          </button>
        </div>
      </Card>

      <Card title="Detalle de ruta" bodyClass="p-0">
        {filas.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-3">
            El camión aún no tiene carga.
          </div>
        ) : (
          <div className="overflow-x-auto table-scroll">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                  <th className="px-4 py-3 font-semibold">Producto</th>
                  <th className="px-4 py-3 text-center font-semibold">Salida</th>
                  <th className="px-4 py-3 text-center font-semibold">Regreso</th>
                  <th className="px-4 py-3 text-center font-semibold">Vendido</th>
                  <th className="px-4 py-3 text-right font-semibold">Precio</th>
                  <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.producto_id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold">{f.producto}</td>
                    <td className="px-4 py-3 text-center tnum">{f.salida}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={f.salida}
                        value={f.regreso}
                        onChange={(e) =>
                          setRegresos((r) => {
                            const n = [...r];
                            n[i] = Number(e.target.value);
                            return n;
                          })
                        }
                        className="field-input mx-auto h-9 w-20 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-center tnum font-bold text-brand">
                      {f.vendido}
                    </td>
                    <td className="px-4 py-3 text-right tnum text-ink-2">
                      Q {money(f.precio)}
                    </td>
                    <td className="px-4 py-3 text-right tnum font-bold">
                      Q {money(f.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong bg-surface-2/40">
                  <td className="px-4 py-3 font-semibold" colSpan={5}>
                    Total del sistema
                  </td>
                  <td className="px-4 py-3 text-right font-display text-base font-bold tnum">
                    Q {money(totalSistema)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-[200px_1fr_auto] sm:items-end">
          <Field label="Efectivo recibido">
            <input
              type="number"
              min={0}
              step="0.01"
              value={efectivo}
              onChange={(e) => setEfectivo(Number(e.target.value))}
              className="field-input"
            />
          </Field>

          <div className="rounded-control bg-surface-2 px-4 py-2">
            <div className="label">Diferencia de caja</div>
            <div
              className={`font-display text-lg font-bold tnum ${
                diferencia < 0 ? "text-neg" : diferencia > 0 ? "text-pos" : "text-ink-1"
              }`}
            >
              Q {money(diferencia)}
            </div>
          </div>

          <button
            className="btn btn-primary h-10"
            disabled={confirmando || filas.length === 0}
            onClick={confirmar}
          >
            {confirmando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Check size={16} strokeWidth={2.5} /> Confirmar ruta
              </>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
