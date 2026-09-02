import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import { Async } from "../components/State";
import Tag from "../components/Tag";
import type { StockData } from "../lib/types";
import { int } from "../lib/format";
import { useApi } from "../lib/useApi";

export default function Stock() {
  const q = useApi<StockData>("/stock");
  const [params] = useSearchParams();
  const [busca, setBusca] = useState(params.get("q") ?? "");

  useEffect(() => {
    const p = params.get("q");
    if (p) setBusca(p);
  }, [params]);

  return (
    <div>
      <PageHeader title="Stock" subtitle="Existencia por producto y por lote" />

      <Async q={q}>
        {(d) => {
          const t = busca.toLowerCase().trim();
          const resumen = d.resumen.filter((r) =>
            r.producto.toLowerCase().includes(t),
          );
          const conStock = d.resumen.filter((r) => r.stock > 0).length;
          const totalUnidades = d.resumen.reduce((a, r) => a + r.stock, 0);
          const bajo = d.resumen.filter((r) => r.stock <= r.minimo).length;

          return (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                {[
                  { l: "Unidades en bodega", v: int(totalUnidades) },
                  { l: "Productos con stock", v: String(conStock) },
                  { l: "Bajo mínimo", v: String(bajo) },
                ].map((s) => (
                  <div key={s.l} className="card p-4">
                    <div className="label">{s.l}</div>
                    <div className="mt-1 font-display text-2xl font-bold tnum">
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card bodyClass="p-0">
                  <div className="flex items-center gap-3 border-b border-line p-4">
                    <h3 className="text-[15px] font-semibold">Stock en bodega</h3>
                    <div className="relative ml-auto w-48">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                      />
                      <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar…"
                        className="field-input pl-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-[460px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface-1">
                        <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                          <th className="px-4 py-2.5 font-semibold">Producto</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.map((r) => (
                          <tr
                            key={r.producto_id}
                            className="border-t border-line row-hover"
                          >
                            <td className="px-4 py-3 font-semibold">{r.producto}</td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex min-w-9 justify-center rounded-pill px-2 py-1 text-[12px] font-bold tnum ${
                                  r.stock === 0
                                    ? "bg-neg/10 text-neg"
                                    : r.stock <= r.minimo
                                      ? "bg-amber-400/10 text-amber-600 dark:text-amber-300"
                                      : "bg-pos/10 text-pos"
                                }`}
                              >
                                {r.stock === 0 ? "Sin stock" : r.stock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card title="Detalle por lote" bodyClass="p-0">
                  <div className="max-h-[460px] overflow-y-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead className="sticky top-0 bg-surface-1">
                        <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                          <th className="px-4 py-2.5 font-semibold">Lote</th>
                          <th className="px-4 py-2.5 font-semibold">Producto</th>
                          <th className="px-4 py-2.5 font-semibold">Vence</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Cant.</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Ubic.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.lotes.map((l) => (
                          <tr
                            key={l.lote_id}
                            className="border-t border-line row-hover"
                          >
                            <td className="px-4 py-3 tnum text-ink-3">#{l.lote_id}</td>
                            <td className="px-4 py-3 font-semibold">{l.producto}</td>
                            <td className="px-4 py-3 tnum text-ink-2">
                              {l.vence || "—"}
                            </td>
                            <td className="px-4 py-3 text-right tnum font-bold">
                              {l.cantidad}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Tag>{l.ubicacion}</Tag>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}
