import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { CategoriaGasto, Gasto } from "../lib/types";
import { Field, Input, Select } from "./Field";

interface Props {
  editando: Gasto | null;
  onSaved: () => void;
  onCancel: () => void;
  soloLectura?: boolean;
}

const CATEGORIAS: { value: CategoriaGasto; label: string }[] = [
  { value: "ALQUILER", label: "Alquiler" },
  { value: "SUELDOS", label: "Sueldos" },
  { value: "COMBUSTIBLE", label: "Combustible" },
  { value: "LUZ", label: "Luz" },
  { value: "AGUA", label: "Agua" },
  { value: "OTRO", label: "Otro" },
];

const vacio = {
  fecha: new Date().toISOString().slice(0, 10),
  categoria: "ALQUILER" as CategoriaGasto,
  descripcion: "",
  monto: "",
  numero_factura: "",
};

export default function GastoForm({ editando, onSaved, onCancel, soloLectura }: Props) {
  const [f, setF] = useState(vacio);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (editando) {
      setF({
        fecha: editando.fecha,
        categoria: editando.categoria,
        descripcion: editando.descripcion,
        monto: String(editando.monto),
        numero_factura: editando.numero_factura,
      });
    } else {
      setF(vacio);
    }
    setError(null);
  }, [editando]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const monto = Number(f.monto);
    if (!f.descripcion.trim()) {
      setError("La descripción es obligatoria (ej. 'Recibo de luz agosto')");
      return;
    }
    if (!monto || monto <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }

    setEnviando(true);
    try {
      const body = { ...f, monto };
      const r = editando
        ? await api.put<{ ok?: boolean; error?: string }>(`/contabilidad/gastos/${editando.id}`, body)
        : await api.post<{ ok?: boolean; error?: string }>("/contabilidad/gastos", body);
      if (r.error) {
        setError(r.error);
        setEnviando(false);
        return;
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setEnviando(false);
    }
  }

  if (soloLectura) {
    return (
      <p className="text-[13px] text-ink-3">
        Tu rol solo puede consultar los gastos. Pide a un administrador que
        registre uno nuevo.
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      {error && (
        <div className="rounded-control border border-neg/30 bg-neg/10 px-3 py-2 text-[13px] font-medium text-neg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <Input
            type="date"
            value={f.fecha}
            onChange={(e) => set("fecha", e.target.value)}
          />
        </Field>
        <Field label="Categoría">
          <Select
            value={f.categoria}
            onChange={(e) => set("categoria", e.target.value as CategoriaGasto)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Descripción">
        <Input
          value={f.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Ej. Recibo EEGSA de agosto"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto (Q)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={f.monto}
            onChange={(e) => set("monto", e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="No. de factura">
          <Input
            value={f.numero_factura}
            onChange={(e) => set("numero_factura", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
      </div>

      <p className="text-[12px] text-ink-3">
        Registra solo gastos facturados: así el cálculo de utilidad neta refleja lo real.
      </p>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn btn-primary flex-1" disabled={enviando}>
          {enviando ? (
            <Loader2 size={16} className="animate-spin" />
          ) : editando ? (
            "Guardar cambios"
          ) : (
            "Registrar gasto"
          )}
        </button>
        {editando && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
