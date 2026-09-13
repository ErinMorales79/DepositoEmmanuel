import { Check, Loader2, Minus, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { Field, Select } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { Async } from "../components/State";
import { api } from "../lib/api";
import type { Catalogos, Producto } from "../lib/types";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";

type Item = { id: number; nombre: string; precio: number; cantidad: number; stock: number };

export default function NuevaVenta() {
  const navigate = useNavigate();
  const productos = useApi<Producto[]>("/productos");
  const cat = useApi<Catalogos>("/catalogos");

  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState(0);
  const [cant, setCant] = useState(1);
  const [carrito, setCarrito] = useState<Item[]>([]);
  const [clienteId, setClienteId] = useState(0);
  const [pago, setPago] = useState("EFECTIVO");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  const disponibles = useMemo(
    () => (productos.data ?? []).filter((p) => p.activo && p.stock > 0),
    [productos.data],
  );
  const lista = useMemo(() => {
    const t = busca.toLowerCase().trim();
    return disponibles.filter((p) => p.nombre.toLowerCase().includes(t));
  }, [busca, disponibles]);

  const prod = disponibles.find((p) => p.id === (sel || lista[0]?.id));
  const clientes = cat.data?.clientes ?? [];
  const cliente = clientes.find((c) => c.id === clienteId);
  const total = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);

  function agregar() {
    if (!prod || cant <= 0) return;
    setCarrito((prev) => {
      const ex = prev.find((i) => i.id === prod.id);
      if (ex) {
        return prev.map((i) =>
          i.id === prod.id
            ? { ...i, cantidad: Math.min(i.cantidad + cant, prod.stock) }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: prod.id,
          nombre: prod.nombre,
          precio: prod.precio_venta,
          cantidad: Math.min(cant, prod.stock),
          stock: prod.stock,
        },
      ];
    });
    setCant(1);
  }

  function cambia(id: number, d: number) {
    setCarrito((prev) =>
      prev
        .map((i) =>
          i.id === id
            ? { ...i, cantidad: Math.max(0, Math.min(i.cantidad + d, i.stock)) }
            : i,
        )
        .filter((i) => i.cantidad > 0),
    );
  }

  async function guardar() {
    if (!carrito.length || !clienteId) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api.post<{ ok?: boolean; error?: string; venta_id?: number }>(
        "/venta",
        {
          cliente_id: clienteId,
          items: carrito.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
        },
      );
      if (r.error) {
        setError(r.error);
        setEnviando(false);
        return;
      }
      setOk(true);
      setTimeout(() => navigate("/ventas"), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar la venta");
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nueva venta"
        subtitle="Mostrador · consumo de stock por FIFO"
      />

      <Async q={productos}>
        {() => (
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {error && (
                <div className="rounded-control border border-neg/30 bg-neg/10 px-3 py-2 text-[13px] font-medium text-neg">
                  {error}
                </div>
              )}

              <Card bodyClass="p-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
                  <Field label="Producto">
                    <div className="space-y-2">
                      <div className="relative">
                        <Search
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                        />
                        <input
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          placeholder="Buscar producto…"
                          className="field-input pl-9"
                        />
                      </div>
                      <Select
                        value={sel || lista[0]?.id || 0}
                        onChange={(e) => setSel(Number(e.target.value))}
                      >
                        {lista.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} — Q {money(p.precio_venta)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </Field>

                  <Field label="Cantidad">
                    <input
                      type="number"
                      min={1}
                      value={cant}
                      onChange={(e) => setCant(Number(e.target.value))}
                      className="field-input"
                    />
                  </Field>

                  <button className="btn btn-primary h-10" onClick={agregar}>
                    <Plus size={16} strokeWidth={2.5} /> Agregar
                  </button>
                </div>

                {prod && (
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
                    Stock disponible
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[12px] font-bold tnum ${
                        prod.stock <= prod.stock_minimo
                          ? "bg-amber-400/10 text-amber-600 dark:text-amber-300"
                          : "bg-pos/10 text-pos"
                      }`}
                    >
                      {prod.stock}
                    </span>
                  </div>
                )}
              </Card>

              <Card
                title="Carrito"
                action={
                  <span className="text-[12px] font-semibold text-ink-3">
                    {carrito.length} {carrito.length === 1 ? "ítem" : "ítems"}
                  </span>
                }
                bodyClass="p-0"
              >
                {carrito.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-ink-3">
                    Aún no has agregado productos.
                  </div>
                ) : (
                  <div className="overflow-x-auto table-scroll">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                          <th className="px-4 py-2.5 font-semibold">Producto</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Cant.</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Precio</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {carrito.map((i) => (
                          <tr key={i.id} className="border-t border-line">
                            <td className="px-4 py-3 font-semibold">{i.nombre}</td>
                            <td className="px-4 py-3">
                              <div className="mx-auto flex w-fit items-center gap-1.5">
                                <button
                                  className="btn-icon h-7 w-7"
                                  onClick={() => cambia(i.id, -1)}
                                  aria-label="Menos"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="w-6 text-center tnum font-bold">
                                  {i.cantidad}
                                </span>
                                <button
                                  className="btn-icon h-7 w-7"
                                  onClick={() => cambia(i.id, 1)}
                                  aria-label="Más"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tnum text-ink-2">
                              Q {money(i.precio)}
                            </td>
                            <td className="px-4 py-3 text-right tnum font-bold">
                              Q {money(i.precio * i.cantidad)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                className="btn-icon h-7 w-7 text-neg"
                                onClick={() => cambia(i.id, -i.cantidad)}
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
              </Card>
            </div>

            <Card
              title="Detalle de venta"
              bodyClass="p-5 pt-4"
              className="h-fit xl:sticky xl:top-4"
            >
              <div className="space-y-3">
                <Field label="Cliente">
                  <Select
                    value={clienteId}
                    onChange={(e) => setClienteId(Number(e.target.value))}
                  >
                    <option value={0}>Selecciona…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Dirección">
                  <input
                    readOnly
                    value={cliente?.direccion ?? ""}
                    className="field-input text-ink-2"
                  />
                </Field>
                <Field label="Tipo de pago">
                  <Select value={pago} onChange={(e) => setPago(e.target.value)}>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                  </Select>
                </Field>
              </div>

              <div className="my-4 h-px bg-line" />

              <div className="flex items-end justify-between">
                <span className="label">Total</span>
                <span className="font-display text-3xl font-bold tracking-tightish tnum text-brand">
                  Q {money(total)}
                </span>
              </div>

              <button
                className="btn btn-primary mt-4 w-full"
                disabled={carrito.length === 0 || !clienteId || enviando || ok}
                onClick={guardar}
              >
                {ok ? (
                  <>
                    <Check size={16} strokeWidth={2.5} /> Venta guardada
                  </>
                ) : enviando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Guardar venta"
                )}
              </button>
            </Card>
          </div>
        )}
      </Async>
    </div>
  );
}
