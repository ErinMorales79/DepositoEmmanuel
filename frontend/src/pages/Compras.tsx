import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { Async, Spinner } from "../components/State";
import Tag from "../components/Tag";
import { api } from "../lib/api";
import type { Catalogos, Compra, Producto } from "../lib/types";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";

type Linea = {
  producto_id: number;
  producto: string;
  cantidad: number;
  costo: number;
  vence: string;
};

export default function Compras() {
  const cat = useApi<Catalogos>("/catalogos");
  const productos = useApi<Producto[]>("/productos");
  const compras = useApi<Compra[]>("/compras");

  const [prov, setProv] = useState(0);
  const [factura, setFactura] = useState("");
  const [prodId, setProdId] = useState(0);
  const [cant, setCant] = useState(10);
  const [costo, setCosto] = useState(0);
  const [vence, setVence] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  const activos = (productos.data ?? []).filter((p) => p.activo);
  const total = lineas.reduce((a, l) => a + l.cantidad * l.costo, 0);

  function agregar() {
    const p = activos.find((x) => x.id === prodId) ?? activos[0];
    if (!p || cant <= 0) return;
    if (p.requiere_vencimiento && !vence) {
      setError(`"${p.nombre}" requiere fecha de vencimiento`);
      return;
    }
    setError(null);
    setLineas((prev) => [
      ...prev,
      { producto_id: p.id, producto: p.nombre, cantidad: cant, costo, vence },
    ]);
  }

  async function guardar() {
    if (!prov || !factura.trim() || lineas.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api.post<{ ok?: boolean; error?: string }>("/compra", {
        proveedor_id: prov,
        numero_factura: factura.trim(),
        items: lineas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          precio_unitario: l.costo,
          fecha_vencimiento: l.vence,
        })),
      });
      if (r.error) {
        setError(r.error);
        setEnviando(false);
        return;
      }
      setOk(true);
      setTimeout(() => {
        setOk(false);
        setLineas([]);
        setFactura("");
        compras.reload();
        productos.reload();
        setEnviando(false);
      }, 1400);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar la compra");
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader title="Compras" subtitle="Ingreso de mercadería a bodega" />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card title="Nueva compra" bodyClass="p-5 pt-4">
            {error && (
              <div className="mb-3 rounded-control border border-neg/30 bg-neg/10 px-3 py-2 text-[13px] font-medium text-neg">
                {error}
              </div>
            )}
            <Async q={cat}>
              {(c) => (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Proveedor">
                      <Select
                        value={prov}
                        onChange={(e) => setProv(Number(e.target.value))}
                      >
                        <option value={0}>Selecciona…</option>
                        {c.proveedores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Número de factura">
                      <Input
                        value={factura}
                        onChange={(e) => setFactura(e.target.value)}
                        placeholder="Ej. FAC-004"
                      />
                    </Field>
                  </div>

                  {productos.loading ? (
                    <Spinner label="Cargando productos…" />
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_80px_100px_150px_auto] sm:items-end">
                      <Field label="Producto">
                        <Select
                          value={prodId || activos[0]?.id || 0}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            setProdId(id);
                            const p = activos.find((x) => x.id === id);
                            if (p) setCosto(p.precio_compra);
                          }}
                        >
                          {activos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Cant.">
                        <input
                          type="number"
                          min={1}
                          value={cant}
                          onChange={(e) => setCant(Number(e.target.value))}
                          className="field-input"
                        />
                      </Field>
                      <Field label="Costo">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={costo}
                          onChange={(e) => setCosto(Number(e.target.value))}
                          className="field-input"
                        />
                      </Field>
                      <Field label="Vence">
                        <input
                          type="date"
                          value={vence}
                          onChange={(e) => setVence(e.target.value)}
                          className="field-input"
                        />
                      </Field>
                      <button className="btn h-10" onClick={agregar}>
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </Async>
          </Card>

          <Card title="Detalle de compra" bodyClass="p-0">
            {lineas.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-3">
                Agrega productos a la compra.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                      <th className="px-4 py-2.5 font-semibold">Producto</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Cant.</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Costo</th>
                      <th className="px-4 py-2.5 font-semibold">Vence</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, idx) => (
                      <tr key={idx} className="border-t border-line">
                        <td className="px-4 py-3 font-semibold">{l.producto}</td>
                        <td className="px-4 py-3 text-center tnum">{l.cantidad}</td>
                        <td className="px-4 py-3 text-right tnum text-ink-2">
                          Q {money(l.costo)}
                        </td>
                        <td className="px-4 py-3 tnum text-ink-2">{l.vence || "—"}</td>
                        <td className="px-4 py-3 text-right tnum font-bold">
                          Q {money(l.cantidad * l.costo)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="btn-icon h-7 w-7 text-neg"
                            onClick={() =>
                              setLineas((p) => p.filter((_, i) => i !== idx))
                            }
                            aria-label="Quitar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line px-5 py-4">
              <span className="label">Total compra</span>
              <span className="font-display text-2xl font-bold tnum">
                Q {money(total)}
              </span>
            </div>
            <div className="px-5 pb-5">
              <button
                className="btn btn-primary w-full"
                disabled={
                  lineas.length === 0 || !factura.trim() || !prov || enviando
                }
                onClick={guardar}
              >
                {ok ? (
                  <>
                    <Check size={16} strokeWidth={2.5} /> Compra registrada
                  </>
                ) : enviando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Guardar compra"
                )}
              </button>
            </div>
          </Card>
        </div>

        <Card title="Compras recientes" bodyClass="p-2">
          <Async q={compras}>
            {(rows) =>
              rows.slice(0, 12).map((c) => (
                <div
                  key={c.id}
                  className="row-hover flex items-center gap-3 rounded-control px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">
                      {c.proveedor}
                    </div>
                    <div className="text-[11px] text-ink-3">
                      {c.factura} · {c.fecha}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold tnum">Q {money(c.total)}</div>
                    <Tag tone={c.estado === "FINALIZADA" ? "pos" : "warn"}>
                      {c.estado}
                    </Tag>
                  </div>
                </div>
              ))
            }
          </Async>
        </Card>
      </div>
    </div>
  );
}
