import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import ClienteForm from "../components/ClienteForm";
import PageHeader from "../components/PageHeader";
import { Async } from "../components/State";
import Tag from "../components/Tag";
import { useAuth } from "../auth";
import { api } from "../lib/api";
import { money } from "../lib/format";
import type { Cliente, ClienteDetalle } from "../lib/types";
import { useApi } from "../lib/useApi";

export default function Clientes() {
  const { usuario } = useAuth();
  const soloLectura = (usuario?.solo_lectura ?? []).includes("clientes");

  const lista = useApi<Cliente[]>("/clientes");
  const [params] = useSearchParams();
  const [busca, setBusca] = useState(params.get("q") ?? "");

  useEffect(() => {
    const q = params.get("q");
    if (q) setBusca(q);
  }, [params]);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);

  function onSaved() {
    setEditando(null);
    lista.reload();
  }

  async function eliminar(c: Cliente) {
    if (!confirm(`¿Eliminar a "${c.nombre}"? Esta acción no se puede deshacer.`)) return;
    const r = await api.delete<{ ok?: boolean; error?: string }>(`/clientes/${c.id}`);
    if (r.error) {
      alert(r.error);
      return;
    }
    if (editando?.id === c.id) setEditando(null);
    lista.reload();
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={lista.data ? `${lista.data.length} clientes registrados` : "Cartera de clientes"}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Async q={lista}>
          {(clientes) => {
            const t = busca.toLowerCase().trim();
            const filtrados = clientes.filter(
              (c) =>
                c.nombre.toLowerCase().includes(t) || c.telefono.toLowerCase().includes(t),
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
                      placeholder="Buscar por nombre o teléfono…"
                      className="field-input pl-9"
                    />
                  </div>
                </div>

                {filtrados.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-ink-3">
                    Sin clientes para mostrar.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                          <th className="px-4 py-2.5 font-semibold">Cliente</th>
                          <th className="px-4 py-2.5 font-semibold">Teléfono</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Tipo</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Ventas</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((c) => (
                          <ClienteFila
                            key={c.id}
                            c={c}
                            editando={editando?.id === c.id}
                            expandido={expandido === c.id}
                            soloLectura={soloLectura}
                            onEditar={() => setEditando(c)}
                            onEliminar={() => eliminar(c)}
                            onExpandir={() => setExpandido(expandido === c.id ? null : c.id)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          }}
        </Async>

        <Card
          title={editando ? `Editar cliente #${editando.id}` : "Nuevo cliente"}
          action={
            !soloLectura && (
              <span className="grid h-8 w-8 place-items-center rounded-control bg-surface-2 text-ink-2">
                <Users size={15} />
              </span>
            )
          }
          bodyClass="p-5 pt-4"
        >
          <ClienteForm
            editando={editando}
            onSaved={onSaved}
            onCancel={() => setEditando(null)}
            soloLectura={soloLectura}
          />
        </Card>
      </div>
    </div>
  );
}

function ClienteFila({
  c,
  editando,
  expandido,
  soloLectura,
  onEditar,
  onEliminar,
  onExpandir,
}: {
  c: Cliente;
  editando: boolean;
  expandido: boolean;
  soloLectura: boolean;
  onEditar: () => void;
  onEliminar: () => void;
  onExpandir: () => void;
}) {
  const detalle = useApi<ClienteDetalle>(expandido ? `/clientes/${c.id}` : null);

  return (
    <>
      <tr className={`border-t border-line row-hover ${editando ? "bg-surface-2" : ""}`}>
        <td className="px-4 py-3">
          <div className="font-semibold">{c.nombre}</div>
          <div className="truncate text-[11px] text-ink-3">{c.direccion}</div>
        </td>
        <td className="px-4 py-3 tnum text-ink-2">{c.telefono || "—"}</td>
        <td className="px-4 py-3 text-center">
          <Tag tone={c.es_ocasional ? "neutral" : "accent"}>
            {c.es_ocasional ? "Ocasional" : "Frecuente"}
          </Tag>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="font-bold tnum">{c.ventas_count}</div>
          <div className="text-[11px] text-ink-3">Q {money(c.ventas_total)}</div>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-1">
            <button
              className="btn-icon h-8 w-8"
              aria-label="Ver historial"
              onClick={onExpandir}
            >
              {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {!soloLectura && (
              <>
                <button className="btn-icon h-8 w-8" aria-label="Editar" onClick={onEditar}>
                  <Pencil size={14} />
                </button>
                <button
                  className="btn-icon h-8 w-8 text-neg"
                  aria-label="Eliminar"
                  onClick={onEliminar}
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {expandido && (
        <tr className="border-t border-line bg-surface-2/40">
          <td colSpan={5} className="px-4 py-3">
            {detalle.loading ? (
              <div className="flex items-center gap-2 py-2 text-[13px] text-ink-3">
                <Loader2 size={14} className="animate-spin" /> Cargando historial…
              </div>
            ) : detalle.error ? (
              <div className="py-2 text-[13px] text-neg">{detalle.error}</div>
            ) : detalle.data && detalle.data.ventas.length === 0 ? (
              <div className="py-2 text-[13px] text-ink-3">
                Este cliente aún no tiene compras registradas.
              </div>
            ) : (
              <div className="space-y-1.5 py-1">
                <div className="label mb-1">Historial de compras</div>
                {detalle.data?.ventas.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-control px-2 py-1.5 text-[13px]"
                  >
                    <span className="text-ink-2">
                      #{v.id} · {v.fecha} · <Tag>{v.canal}</Tag>
                    </span>
                    <span className="flex items-center gap-2">
                      <Tag
                        tone={
                          v.estado === "FINALIZADA"
                            ? "pos"
                            : v.estado === "ANULADA"
                              ? "neg"
                              : "accent"
                        }
                      >
                        {v.estado}
                      </Tag>
                      <span className="font-bold tnum">Q {money(v.total)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
