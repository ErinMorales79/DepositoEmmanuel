import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Catalogos, Producto } from "../lib/types";
import { Field, Input, Select } from "./Field";

interface Props {
  catalogos: Catalogos;
  editando: Producto | null;
  onSaved: () => void;
  onCancel: () => void;
}

const vacio = {
  nombre: "",
  codigo_barra: "",
  marca_id: 0,
  proveedor_id: 0,
  unidades_por_fardo: 1,
  precio_compra: 0,
  precio_venta: 0,
  stock_minimo: 0,
  requiere_vencimiento: true,
  es_retornable: false,
};

export default function ProductoForm({
  catalogos,
  editando,
  onSaved,
  onCancel,
}: Props) {
  const [f, setF] = useState({
    ...vacio,
    marca_id: catalogos.marcas[0]?.id ?? 0,
    proveedor_id: catalogos.proveedores[0]?.id ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (editando) {
      setF({
        nombre: editando.nombre,
        codigo_barra: editando.codigo_barra,
        marca_id: editando.marca_id,
        proveedor_id: editando.proveedor_id,
        unidades_por_fardo: editando.unidades_por_fardo,
        precio_compra: editando.precio_compra,
        precio_venta: editando.precio_venta,
        stock_minimo: editando.stock_minimo,
        requiere_vencimiento: editando.requiere_vencimiento,
        es_retornable: editando.es_retornable,
      });
    } else {
      setF({
        ...vacio,
        marca_id: catalogos.marcas[0]?.id ?? 0,
        proveedor_id: catalogos.proveedores[0]?.id ?? 0,
      });
    }
    setError(null);
  }, [editando, catalogos]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[0-9]{8,14}$/.test(f.codigo_barra)) {
      setError("El código de barra debe tener entre 8 y 14 dígitos");
      return;
    }
    setEnviando(true);
    try {
      const r = editando
        ? await api.put<{ ok?: boolean; error?: string }>(
            `/productos/${editando.id}`,
            f,
          )
        : await api.post<{ ok?: boolean; error?: string }>("/productos", f);
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

  return (
    <form className="space-y-3" onSubmit={submit}>
      {error && (
        <div className="rounded-control border border-neg/30 bg-neg/10 px-3 py-2 text-[13px] font-medium text-neg">
          {error}
        </div>
      )}

      <Field label="Nombre">
        <Input
          value={f.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Nombre del producto"
        />
      </Field>
      <Field label="Código de barra">
        <Input
          value={f.codigo_barra}
          onChange={(e) => set("codigo_barra", e.target.value)}
          placeholder="8 a 14 dígitos"
          inputMode="numeric"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca">
          <Select
            value={f.marca_id}
            onChange={(e) => set("marca_id", Number(e.target.value))}
          >
            {catalogos.marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Proveedor">
          <Select
            value={f.proveedor_id}
            onChange={(e) => set("proveedor_id", Number(e.target.value))}
          >
            {catalogos.proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unid. / fardo">
          <Input
            type="number"
            min={1}
            value={f.unidades_por_fardo}
            onChange={(e) => set("unidades_por_fardo", Number(e.target.value))}
          />
        </Field>
        <Field label="Stock mínimo">
          <Input
            type="number"
            min={0}
            value={f.stock_minimo}
            onChange={(e) => set("stock_minimo", Number(e.target.value))}
          />
        </Field>
        <Field label="Precio compra">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={f.precio_compra}
            onChange={(e) => set("precio_compra", Number(e.target.value))}
          />
        </Field>
        <Field label="Precio venta">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={f.precio_venta}
            onChange={(e) => set("precio_venta", Number(e.target.value))}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <input
          type="checkbox"
          checked={f.requiere_vencimiento}
          onChange={(e) => set("requiere_vencimiento", e.target.checked)}
          className="h-4 w-4 rounded accent-accent"
        />
        Requiere fecha de vencimiento
      </label>
      <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <input
          type="checkbox"
          checked={f.es_retornable}
          onChange={(e) => set("es_retornable", e.target.checked)}
          className="h-4 w-4 rounded accent-accent"
        />
        Envase retornable
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn btn-primary flex-1" disabled={enviando}>
          {enviando ? (
            <Loader2 size={16} className="animate-spin" />
          ) : editando ? (
            "Guardar cambios"
          ) : (
            "Crear producto"
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
