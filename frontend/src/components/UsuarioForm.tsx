import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Rol, UsuarioAdmin } from "../lib/types";
import { Field, Input, Select } from "./Field";

interface Props {
  editando: UsuarioAdmin | null;
  roles: Rol[];
  onSaved: () => void;
  onCancel: () => void;
}

const vacio = {
  nombre: "",
  telefono: "",
  username: "",
  email: "",
  rol_id: "",
  password: "",
};

export default function UsuarioForm({ editando, roles, onSaved, onCancel }: Props) {
  const [f, setF] = useState(vacio);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (editando) {
      setF({
        nombre: editando.nombre,
        telefono: editando.telefono,
        username: editando.username,
        email: editando.email,
        rol_id: editando.rol_id ? String(editando.rol_id) : "",
        password: "",
      });
    } else {
      setF({ ...vacio, rol_id: roles[0] ? String(roles[0].id) : "" });
    }
    setError(null);
  }, [editando, roles]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!f.nombre.trim()) return setError("El nombre completo es obligatorio");
    if (!f.username.trim()) return setError("El usuario (nombre de acceso) es obligatorio");
    if (!f.email.trim()) return setError("El correo es obligatorio");
    if (!f.rol_id) return setError("Selecciona un rol");
    if (!editando && f.password.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres");
    }

    setEnviando(true);
    try {
      const body = { ...f, rol_id: Number(f.rol_id) };
      const r = editando
        ? await api.put<{ ok?: boolean; error?: string }>(`/usuarios/${editando.id}`, body)
        : await api.post<{ ok?: boolean; error?: string }>("/usuarios", body);
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

      <Field label="Nombre completo">
        <Input
          value={f.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Nombre y apellido"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Usuario (acceso)">
          <Input
            value={f.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="Ej. jperez"
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
      </div>

      <Field label="Correo">
        <Input
          value={f.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="nombre@depositoemmanuel.com.gt"
        />
      </Field>

      <Field label="Rol">
        <Select value={f.rol_id} onChange={(e) => set("rol_id", e.target.value)}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </Select>
      </Field>

      {!editando && (
        <Field label="Contraseña inicial">
          <Input
            type="text"
            value={f.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </Field>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn btn-primary flex-1" disabled={enviando}>
          {enviando ? (
            <Loader2 size={16} className="animate-spin" />
          ) : editando ? (
            "Guardar cambios"
          ) : (
            "Crear usuario"
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
