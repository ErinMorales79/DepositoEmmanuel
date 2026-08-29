import { Pencil, Power, Search } from "lucide-react";
import { useState } from "react";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import ProductoForm from "../components/ProductoForm";
import { Async } from "../components/State";
import Tag from "../components/Tag";
import { api } from "../lib/api";
import type { Catalogos, Producto } from "../lib/types";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";

export default function Productos() {
  const lista = useApi<Producto[]>("/productos");
  const cat = useApi<Catalogos>("/catalogos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Producto | null>(null);

  async function toggle(id: number) {
    await api.patch(`/productos/${id}/estado`);
    lista.reload();
  }

  function onSaved() {
    setEditando(null);
    lista.reload();
  }

  const activos = (lista.data ?? []).filter((p) => p.activo).length;

  return (
    <div>
      <PageHeader
        title="Productos"
        subtitle={
          lista.data
            ? `${lista.data.length} productos · ${activos} activos`
            : "Catálogo"
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Async q={lista}>
          {(productos) => {
          const t = busca.toLowerCase().trim();
          const filtrados = productos.filter(
            (p) => p.nombre.toLowerCase().includes(t) || p.codigo_barra.includes(t),
          );
          return (
            <Card bodyClass="p-0">
              <div className="flex items-center gap-3 border-b border-line p-4">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                  />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por nombre o código…"
                    className="field-input pl-9"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                      <th className="px-4 py-2.5 font-semibold">Código</th>
                      <th className="px-4 py-2.5 font-semibold">Producto</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Compra</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Venta</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Stock</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Estado</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => {
                      const bajo = p.stock <= p.stock_minimo;
                      return (
                        <tr
                          key={p.id}
                          className={`border-t border-line row-hover ${
                            editando?.id === p.id ? "bg-surface-2" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-[12px] text-ink-3">
                            {p.codigo_barra}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{p.nombre}</div>
                            <div className="text-[11px] text-ink-3">{p.marca}</div>
                          </td>
                          <td className="px-4 py-3 text-right tnum text-ink-2">
                            Q {money(p.precio_compra)}
                          </td>
                          <td className="px-4 py-3 text-right tnum">
                            Q {money(p.precio_venta)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex min-w-9 justify-center rounded-pill px-2 py-1 text-[12px] font-bold tnum ${
                                p.stock === 0
                                  ? "bg-neg/10 text-neg"
                                  : bajo
                                    ? "bg-amber-400/10 text-amber-600 dark:text-amber-300"
                                    : "bg-pos/10 text-pos"
                              }`}
                            >
                              {p.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Tag tone={p.activo ? "pos" : "neg"}>
                              {p.activo ? "Activo" : "Inactivo"}
                            </Tag>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                className="btn-icon h-8 w-8"
                                aria-label="Editar"
                                onClick={() => setEditando(p)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="btn-icon h-8 w-8"
                                aria-label="Activar/Desactivar"
                                onClick={() => toggle(p.id)}
                              >
                                <Power size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
          }}
        </Async>

        <Card
          title={editando ? `Editar #${editando.id}` : "Nuevo producto"}
          bodyClass="p-5 pt-4"
        >
          <Async q={cat}>
            {(catalogos) => (
              <ProductoForm
                catalogos={catalogos}
                editando={editando}
                onSaved={onSaved}
                onCancel={() => setEditando(null)}
              />
            )}
          </Async>
        </Card>
      </div>
    </div>
  );
}
