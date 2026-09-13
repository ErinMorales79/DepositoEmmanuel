import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import { Async } from "../components/State";
import Tag from "../components/Tag";
import type { Venta } from "../lib/types";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";

const estadoTone = {
  FINALIZADA: "pos",
  ACTIVA: "accent",
  ANULADA: "neg",
} as const;

export default function Ventas() {
  const navigate = useNavigate();
  const q = useApi<Venta[]>("/ventas");

  return (
    <div>
      <PageHeader
        title="Ventas"
        subtitle={
          q.data
            ? `${q.data.length} ventas · Q ${money(
                q.data
                  .filter((v) => v.estado === "FINALIZADA")
                  .reduce((a, v) => a + v.total, 0),
              )} finalizadas`
            : "Historial de ventas"
        }
        action={
          <Button
            variant="primary"
            icon={<Plus size={16} strokeWidth={2.5} />}
            onClick={() => navigate("/ventas/nueva")}
          >
            Nueva venta
          </Button>
        }
      />

      <Async q={q}>
        {(ventas) => (
          <Card bodyClass="p-0">
            <div className="overflow-x-auto table-scroll">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 text-center font-semibold">Canal</th>
                    <th className="px-4 py-3 text-center font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Async>
    </div>
  );
}
