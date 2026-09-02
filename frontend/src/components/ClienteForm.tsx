import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Cliente } from "../lib/types";
import { Field, Input } from "./Field";

interface Props {
  editando: Cliente | null;
  onSaved: () => void;
  onCancel: () => void;
  soloLectura?: boolean;
}

const vacio = { nombre: "", direccion: "", telefono: "", es_ocasional: false };

export default function ClienteForm({ editando, onSaved, onCancel, soloLectura }: Props) {
  const [f, setF] = useState(vacio);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (editando) {
      setF({
        nombre: editando.nombre,
        direccion: editando.direccion,
        telefono: editando.telefono,
        es_ocasional: editando.es_ocasional,
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

    if (!f.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!f.direccion.trim()) {
      setError("La dirección de entrega es obligatoria");
      return;
    }

    setEnviando(true);
    try {
      const r = editando
        ? await api.put<{ ok?: boolean; error?: string }>(`/clientes/${editando.id}`, f)
        : await api.post<{ ok?: boolean; error?: string }>("/clientes", f);
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
        Tu rol solo puede consultar clientes. Pide a un administrador que registre
        o edite datos.
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

      <Field label="Nombre">
        <Input
          value={f.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Nombre completo"
        />
      </Field>
      <Field label="Teléfono">
        <Input
          value={f.telefono}
          onChange={(e) => set("telefono", e.target.value)}
          placeholder="Opcional"
          inputMode="tel"
        />
      </Field>
      <Field label="Dirección de entrega">
        <textarea
          value={f.direccion}
          onChange={(e) => set("direccion", e.target.value)}
          placeholder="Referencia clara para el reparto"
          rows={3}
          className="field-input resize-none"
        />
      </Field>

      <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <input
          type="checkbox"
          checked={f.es_ocasional}
          onChange={(e) => set("es_ocasional", e.target.checked)}
          className="h-4 w-4 rounded accent-accent"
        />
        Cliente ocasional (no frecuente)
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn btn-primary flex-1" disabled={enviando}>
          {enviando ? (
            <Loader2 size={16} className="animate-spin" />
          ) : editando ? (
            "Guardar cambios"
          ) : (
            "Registrar cliente"
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
