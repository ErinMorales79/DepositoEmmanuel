import {
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  LockOpen,
  Pencil,
  Power,
  Trash2,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import Card from "../components/Card";
import { Field, Input } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { Async } from "../components/State";
import Tag from "../components/Tag";
import UsuarioForm from "../components/UsuarioForm";
import { api } from "../lib/api";
import type { ActividadUsuario, Rol, UsuarioAdmin } from "../lib/types";
import { useApi } from "../lib/useApi";

// --- formulario chico para resetear la contraseña ---
function ResetPasswordForm({
  usuario,
  onDone,
  onCancel,
}: {
  usuario: UsuarioAdmin;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setEnviando(true);
    const r = await api.put<{ ok?: boolean; error?: string }>(
      `/usuarios/${usuario.id}/password`,
      { password },
    );
    if (r.error) {
      setError(r.error);
      setEnviando(false);
      return;
    }
    onDone();
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <p className="text-[13px] text-ink-2">
        Nueva contraseña para <span className="font-semibold text-ink-1">{usuario.username}</span>.
      </p>
      {error && (
        <div className="rounded-control border border-neg/30 bg-neg/10 px-3 py-2 text-[13px] font-medium text-neg">
          {error}
        </div>
      )}
      <Field label="Contraseña nueva">
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
      </Field>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn btn-primary flex-1" disabled={enviando}>
          {enviando ? <Loader2 size={16} className="animate-spin" /> : "Restablecer"}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// --- botones de accion (los usa la tabla y tambien la tarjeta) ---
interface AccionesProps {
  u: UsuarioAdmin;
  expandido: boolean;
  onEditar: () => void;
  onPassword: () => void;
  onEliminar: () => void;
  onExpandir: () => void;
  onToggleEstado: () => void;
  onDesbloquear: () => void;
}

function AccionesIconos({ u, expandido, onEditar, onPassword, onEliminar, onExpandir, onToggleEstado, onDesbloquear }: AccionesProps) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <button className="btn-icon h-8 w-8" aria-label="Ver actividad" onClick={onExpandir}>
        {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <button className="btn-icon h-8 w-8" aria-label="Editar" onClick={onEditar}>
        <Pencil size={14} />
      </button>
      <button className="btn-icon h-8 w-8" aria-label="Restablecer contraseña" onClick={onPassword}>
        <KeyRound size={14} />
      </button>
      {u.bloqueado && (
        <button className="btn-icon h-8 w-8 text-amber-500" aria-label="Desbloquear" onClick={onDesbloquear}>
          <LockOpen size={14} />
        </button>
      )}
      <button
        className={`btn-icon h-8 w-8 ${u.activo ? "text-amber-500" : "text-pos"}`}
        aria-label={u.activo ? "Desactivar" : "Activar"}
        onClick={onToggleEstado}
      >
        <Power size={14} />
      </button>
      <button className="btn-icon h-8 w-8 text-neg" aria-label="Eliminar" onClick={onEliminar}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// los mismos botones pero con texto, para la tarjeta de celular
// (un icono solo es mas dificil de acertar y de entender con el dedo)
function AccionesBotones({ u, onEditar, onPassword, onEliminar, onToggleEstado, onDesbloquear }: AccionesProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button className="btn h-9 flex-1 basis-[45%]" onClick={onEditar}>
        <Pencil size={14} /> Editar
      </button>
      <button className="btn h-9 flex-1 basis-[45%]" onClick={onPassword}>
        <KeyRound size={14} /> Contraseña
      </button>
      {u.bloqueado && (
        <button className="btn h-9 flex-1 basis-[45%] text-amber-500" onClick={onDesbloquear}>
          <LockOpen size={14} /> Desbloquear
        </button>
      )}
      <button
        className={`btn h-9 flex-1 basis-[45%] ${u.activo ? "text-amber-500" : "text-pos"}`}
        onClick={onToggleEstado}
      >
        <Power size={14} /> {u.activo ? "Desactivar" : "Activar"}
      </button>
      <button className="btn h-9 flex-1 basis-[45%] text-neg" onClick={onEliminar}>
        <Trash2 size={14} /> Eliminar
      </button>
    </div>
  );
}

function Actividad({ usuarioId }: { usuarioId: number }) {
  const act = useApi<ActividadUsuario[]>(`/usuarios/${usuarioId}/actividad`);
  if (act.loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-[13px] text-ink-3">
        <Loader2 size={14} className="animate-spin" /> Cargando actividad…
      </div>
    );
  }
  if (act.data && act.data.length === 0) {
    return <div className="py-2 text-[13px] text-ink-3">Sin actividad registrada todavía.</div>;
  }
  return (
    <div className="space-y-1.5 py-1">
      <div className="label mb-1">Últimas acciones (bitácora)</div>
      {act.data?.map((a, i) => (
        <div key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-control px-2 py-1.5 text-[13px]">
          <span className="text-ink-2">
            {a.fecha} · <Tag>{a.accion}</Tag> {a.entidad}
            {a.registro_id ? ` #${a.registro_id}` : ""}
          </span>
          {a.detalle && <span className="truncate text-[12px] text-ink-3">{a.detalle}</span>}
        </div>
      ))}
    </div>
  );
}

// --- fila de tabla (compu) y tarjeta (celular), muestran lo mismo distinto ---
function UsuarioFila({ u, expandido, acciones }: { u: UsuarioAdmin; expandido: boolean; acciones: AccionesProps }) {
  return (
    <>
      <tr className={`border-t border-line row-hover ${u.activo ? "" : "opacity-60"}`}>
        <td className="px-4 py-3">
          <div className="font-semibold">{u.nombre}</div>
          <div className="text-[11px] text-ink-3">
            @{u.username} · {u.email}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <Tag tone={u.rol === "Admin" ? "accent" : "neutral"}>{u.rol}</Tag>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex flex-col items-center gap-1">
            <Tag tone={u.activo ? "pos" : "neg"}>{u.activo ? "Activo" : "Inactivo"}</Tag>
            {u.bloqueado && <Tag tone="warn">Bloqueado</Tag>}
          </div>
        </td>
        <td className="px-4 py-3 text-center text-ink-2">{u.ultimo_acceso || "Nunca"}</td>
        <td className="px-4 py-3">
          <AccionesIconos {...acciones} />
        </td>
      </tr>

      {expandido && (
        <tr className="border-t border-line bg-surface-2/40">
          <td colSpan={5} className="px-4 py-3">
            <Actividad usuarioId={u.id} />
          </td>
        </tr>
      )}
    </>
  );
}

function UsuarioCard({ u, expandido, acciones }: { u: UsuarioAdmin; expandido: boolean; acciones: AccionesProps }) {
  return (
    <div className={`p-4 ${u.activo ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{u.nombre}</div>
          <div className="truncate text-[11px] text-ink-3">
            @{u.username} · {u.email}
          </div>
        </div>
        <button className="btn-icon h-8 w-8 shrink-0" aria-label="Ver actividad" onClick={acciones.onExpandir}>
          {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Tag tone={u.rol === "Admin" ? "accent" : "neutral"}>{u.rol}</Tag>
        <Tag tone={u.activo ? "pos" : "neg"}>{u.activo ? "Activo" : "Inactivo"}</Tag>
        {u.bloqueado && <Tag tone="warn">Bloqueado</Tag>}
        <span className="text-[11px] text-ink-3">· Último acceso: {u.ultimo_acceso || "Nunca"}</span>
      </div>

      <div className="mt-3">
        <AccionesBotones {...acciones} />
      </div>

      {expandido && (
        <div className="mt-3 border-t border-line pt-2">
          <Actividad usuarioId={u.id} />
        </div>
      )}
    </div>
  );
}

export default function Usuarios() {
  const lista = useApi<UsuarioAdmin[]>("/usuarios");
  const roles = useApi<Rol[]>("/usuarios/roles");

  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [resetPass, setResetPass] = useState<UsuarioAdmin | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);

  function onSaved() {
    setEditando(null);
    setCreando(false);
    lista.reload();
  }

  async function toggleEstado(u: UsuarioAdmin) {
    if (u.activo && !confirm(`¿Desactivar a "${u.nombre}"? No podrá volver a iniciar sesión.`)) return;
    const r = await api.patch<{ ok?: boolean; error?: string }>(`/usuarios/${u.id}/estado`);
    if (r.error) {
      alert(r.error);
      return;
    }
    lista.reload();
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Altas, roles, activar/desactivar y contraseñas — solo Admin"
        action={
          <button className="btn btn-primary" onClick={() => { setEditando(null); setCreando(true); }}>
            <UserCog size={16} /> Nuevo usuario
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Async q={lista}>
          {(usuarios) => {
            if (usuarios.length === 0) {
              return (
                <Card bodyClass="p-0">
                  <div className="px-5 py-10 text-center text-sm text-ink-3">
                    Sin usuarios registrados.
                  </div>
                </Card>
              );
            }

            const accionesDe = (u: UsuarioAdmin): AccionesProps => ({
              u,
              expandido: expandido === u.id,
              onEditar: () => { setCreando(false); setResetPass(null); setEditando(u); },
              onPassword: () => { setCreando(false); setEditando(null); setResetPass(u); },
              onExpandir: () => setExpandido(expandido === u.id ? null : u.id),
              onToggleEstado: () => toggleEstado(u),
              onDesbloquear: async () => {
                await api.post(`/usuarios/${u.id}/desbloquear`);
                lista.reload();
              },
              onEliminar: async () => {
                if (!confirm(`¿Eliminar a "${u.nombre}"? Esta acción no se puede deshacer.`)) return;
                const r = await api.delete<{ ok?: boolean; error?: string }>(`/usuarios/${u.id}`);
                if (r.error) { alert(r.error); return; }
                lista.reload();
              },
            });

            return (
              <Card bodyClass="p-0">
                {/* en compu: tabla, con la 1ra columna fija al deslizar */}
                <div className="hidden overflow-x-auto table-scroll lg:block">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-label text-ink-3">
                        <th className="px-4 py-2.5 font-semibold">Usuario</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Rol</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Estado</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Último acceso</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((u) => (
                        <UsuarioFila key={u.id} u={u} expandido={expandido === u.id} acciones={accionesDe(u)} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* en celular: tarjetas apiladas, sin necesidad de deslizar */}
                <div className="divide-y divide-line lg:hidden">
                  {usuarios.map((u) => (
                    <UsuarioCard key={u.id} u={u} expandido={expandido === u.id} acciones={accionesDe(u)} />
                  ))}
                </div>
              </Card>
            );
          }}
        </Async>

        <Async q={roles}>
          {(listaRoles) => (
            <Card
              title={
                resetPass
                  ? "Restablecer contraseña"
                  : editando
                    ? `Editar usuario #${editando.id}`
                    : "Nuevo usuario"
              }
              bodyClass="p-5 pt-4"
            >
              {resetPass ? (
                <ResetPasswordForm
                  usuario={resetPass}
                  onDone={() => { setResetPass(null); lista.reload(); }}
                  onCancel={() => setResetPass(null)}
                />
              ) : editando || creando ? (
                <UsuarioForm
                  editando={editando}
                  roles={listaRoles}
                  onSaved={onSaved}
                  onCancel={() => { setEditando(null); setCreando(false); }}
                />
              ) : (
                <p className="text-[13px] text-ink-3">
                  Selecciona "Nuevo usuario" o edita uno de la lista.
                </p>
              )}
            </Card>
          )}
        </Async>
      </div>
    </div>
  );
}
