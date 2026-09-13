"""Módulo Usuarios: alta, edición, activar/desactivar, resetear contraseña,
desbloqueo de intentos fallidos y bitácora por usuario. Exclusivo de Admin
(único rol con el módulo "usuarios" en app/permissions.py).
"""

import re

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import audit
from app.auth import get_db, verificar_permiso
from app.errors import error_generico
from app.routers.auth_api import _bloqueado, _limpiar_intentos

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])

_EMAIL_FORMATO = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
_DOMINIOS_VALIDOS = ("@depositoemmanuel.gt", "@depositoemmanuel.com.gt")


def _rows(db: Session, sql: str, params: dict | None = None) -> list[dict]:
    return [dict(r) for r in db.execute(text(sql), params or {}).mappings().all()]


def _one(db: Session, sql: str, params: dict | None = None) -> dict | None:
    r = db.execute(text(sql), params or {}).mappings().first()
    return dict(r) if r else None


def _es_ultimo_admin_activo(db: Session, usuario_id: int) -> bool:
    """True si usuario_id es Admin activo y no queda ningún otro Admin activo."""
    row = _one(
        db,
        """
        SELECT
            EXISTS(
                SELECT 1 FROM usuario u
                JOIN usuario_rol ur ON ur.usuario_id = u.id
                JOIN rol r ON r.id = ur.rol_id
                WHERE u.id = :id AND u.activo = true AND r.nombre = 'Admin'
            ) AS es_admin_activo,
            (
                SELECT COUNT(*) FROM usuario u
                JOIN usuario_rol ur ON ur.usuario_id = u.id
                JOIN rol r ON r.id = ur.rol_id
                WHERE u.activo = true AND r.nombre = 'Admin' AND u.id != :id
            ) AS otros_admins
        """,
        {"id": usuario_id},
    )
    return bool(row and row["es_admin_activo"] and row["otros_admins"] == 0)


def _leer_usuario(data: dict, requerir_password: bool):
    nombre = str(data.get("nombre", "")).strip()
    telefono = str(data.get("telefono", "") or "").strip() or None
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "") or "").strip()

    try:
        rol_id = int(data.get("rol_id") or 0)
    except (TypeError, ValueError):
        return None, "Rol inválido"

    if not nombre:
        return None, "El nombre completo es obligatorio"
    if not username or len(username) > 60:
        return None, "El usuario (nombre de acceso) es obligatorio"
    if not _EMAIL_FORMATO.match(email):
        return None, "El correo no tiene un formato válido"
    if not email.endswith(_DOMINIOS_VALIDOS):
        return None, "El correo debe terminar en @depositoemmanuel.gt o @depositoemmanuel.com.gt"
    if not rol_id:
        return None, "Selecciona un rol"
    if requerir_password and len(password) < 6:
        return None, "La contraseña debe tener al menos 6 caracteres"

    return {
        "nombre": nombre,
        "telefono": telefono,
        "username": username,
        "email": email,
        "rol_id": rol_id,
        "password": password,
    }, None


# ============================================================
# LISTAR
# ============================================================
@router.get("")
def listar(request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "usuarios")
    filas = _rows(
        db,
        """
        SELECT u.id, u.username, u.email::text AS email, u.activo,
               e.nombre, COALESCE(e.telefono, '') AS telefono,
               COALESCE((
                   SELECT r.nombre FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id
                   WHERE ur.usuario_id = u.id ORDER BY r.id LIMIT 1
               ), '') AS rol,
               (
                   SELECT r.id FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id
                   WHERE ur.usuario_id = u.id ORDER BY r.id LIMIT 1
               ) AS rol_id,
               (
                   SELECT to_char(MAX(b.fecha_hora), 'DD/MM/YYYY HH24:MI')
                   FROM bitacora b WHERE b.usuario_id = u.id AND b.accion = 'LOGIN'
               ) AS ultimo_acceso
        FROM usuario u
        JOIN empleado e ON e.id = u.empleado_id
        ORDER BY e.nombre
        """,
    )
    for f in filas:
        f["bloqueado"] = _bloqueado(f["username"]) > 0
    return filas


@router.get("/roles")
def listar_roles(request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "usuarios")
    return _rows(db, "SELECT id, nombre FROM rol ORDER BY nombre")


@router.get("/{usuario_id}/actividad")
def actividad(usuario_id: int, request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "usuarios")
    return _rows(
        db,
        """
        SELECT to_char(fecha_hora, 'DD/MM/YYYY HH24:MI') AS fecha,
               accion, entidad, registro_id, COALESCE(detalle, '') AS detalle
        FROM bitacora
        WHERE usuario_id = :id
        ORDER BY fecha_hora DESC
        LIMIT 30
        """,
        {"id": usuario_id},
    )


# ============================================================
# CREAR
# ============================================================
@router.post("")
def crear(data: dict, request: Request, db: Session = Depends(get_db)):
    admin_id = verificar_permiso(request, db, "usuarios", escritura=True)

    try:
        valores, error = _leer_usuario(data, requerir_password=True)
        if error:
            return {"error": error}

        rol = _one(db, "SELECT id, nombre FROM rol WHERE id = :id", {"id": valores["rol_id"]})
        if not rol:
            return {"error": "Rol inválido"}

        if _one(db, "SELECT id FROM usuario WHERE username = :u", {"u": valores["username"]}):
            return {"error": "Ya existe un usuario con ese nombre de acceso"}
        if _one(db, "SELECT id FROM usuario WHERE email = :e", {"e": valores["email"]}):
            return {"error": "Ya existe un usuario con ese correo"}

        empleado = db.execute(
            text("INSERT INTO empleado (nombre, telefono, activo) VALUES (:nombre, :telefono, true) RETURNING id"),
            valores,
        ).first()
        empleado_id = int(empleado[0])

        usuario = db.execute(
            text(
                """
                INSERT INTO usuario (empleado_id, username, password_hash, email, activo)
                VALUES (:empleado_id, :username, crypt(:password, gen_salt('bf')), :email, true)
                RETURNING id
                """
            ),
            {**valores, "empleado_id": empleado_id},
        ).first()
        usuario_id = int(usuario[0])

        db.execute(
            text("INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (:uid, :rid)"),
            {"uid": usuario_id, "rid": valores["rol_id"]},
        )
        db.commit()

        audit.registrar(
            admin_id, "CREAR", "usuario", usuario_id,
            detalle=f"Alta de usuario {valores['username']} ({rol['nombre']})",
            despues={"username": valores["username"], "email": valores["email"], "rol": rol["nombre"]},
        )
        return {"ok": True, "usuario_id": usuario_id}

    except IntegrityError:
        db.rollback()
        return {"error": "Ya existe un usuario con ese nombre de acceso o correo"}
    except Exception as e:
        db.rollback()
        return error_generico(e, "crear usuario")


# ============================================================
# EDITAR
# ============================================================
@router.put("/{usuario_id}")
def editar(usuario_id: int, data: dict, request: Request, db: Session = Depends(get_db)):
    admin_id = verificar_permiso(request, db, "usuarios", escritura=True)

    try:
        existente = _one(
            db,
            """
            SELECT u.id, u.empleado_id,
                   COALESCE((
                       SELECT r.nombre FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id
                       WHERE ur.usuario_id = u.id ORDER BY r.id LIMIT 1
                   ), '') AS rol_actual
            FROM usuario u WHERE u.id = :id
            """,
            {"id": usuario_id},
        )
        if not existente:
            return {"error": "Usuario no encontrado"}

        valores, error = _leer_usuario(data, requerir_password=False)
        if error:
            return {"error": error}

        rol = _one(db, "SELECT id, nombre FROM rol WHERE id = :id", {"id": valores["rol_id"]})
        if not rol:
            return {"error": "Rol inválido"}

        if existente["rol_actual"] == "Admin" and rol["nombre"] != "Admin" and _es_ultimo_admin_activo(db, usuario_id):
            return {"error": "Debe quedar al menos un Admin activo. Asigna otro Admin antes de cambiar este rol."}

        dup_user = _one(
            db, "SELECT id FROM usuario WHERE username = :u AND id != :id",
            {"u": valores["username"], "id": usuario_id},
        )
        if dup_user:
            return {"error": "Ya existe otro usuario con ese nombre de acceso"}
        dup_email = _one(
            db, "SELECT id FROM usuario WHERE email = :e AND id != :id",
            {"e": valores["email"], "id": usuario_id},
        )
        if dup_email:
            return {"error": "Ya existe otro usuario con ese correo"}

        db.execute(
            text("UPDATE empleado SET nombre = :nombre, telefono = :telefono WHERE id = :id"),
            {**valores, "id": existente["empleado_id"]},
        )
        db.execute(
            text("UPDATE usuario SET username = :username, email = :email WHERE id = :id"),
            {**valores, "id": usuario_id},
        )
        db.execute(text("DELETE FROM usuario_rol WHERE usuario_id = :id"), {"id": usuario_id})
        db.execute(
            text("INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (:uid, :rid)"),
            {"uid": usuario_id, "rid": valores["rol_id"]},
        )
        db.commit()

        audit.registrar(
            admin_id, "EDITAR", "usuario", usuario_id,
            detalle=f"Edición de usuario {valores['username']} ({rol['nombre']})",
            despues={"username": valores["username"], "email": valores["email"], "rol": rol["nombre"]},
        )
        return {"ok": True}

    except IntegrityError:
        db.rollback()
        return {"error": "Ya existe un usuario con ese nombre de acceso o correo"}
    except Exception as e:
        db.rollback()
        return error_generico(e, "editar usuario")


# ============================================================
# ACTIVAR / DESACTIVAR
# ============================================================
@router.patch("/{usuario_id}/estado")
def cambiar_estado(usuario_id: int, request: Request, db: Session = Depends(get_db)):
    admin_id = verificar_permiso(request, db, "usuarios", escritura=True)

    try:
        usuario = _one(db, "SELECT id, username, activo FROM usuario WHERE id = :id", {"id": usuario_id})
        if not usuario:
            return {"error": "Usuario no encontrado"}

        nuevo_estado = not bool(usuario["activo"])

        if not nuevo_estado and _es_ultimo_admin_activo(db, usuario_id):
            return {"error": "Debe quedar al menos un Admin activo. No puedes desactivar el único Admin."}

        db.execute(text("UPDATE usuario SET activo = :a WHERE id = :id"), {"a": nuevo_estado, "id": usuario_id})
        db.commit()

        audit.registrar(
            admin_id, "EDITAR", "usuario", usuario_id,
            detalle=f"Usuario {usuario['username']} {'activado' if nuevo_estado else 'desactivado'}",
        )
        return {"ok": True}

    except Exception as e:
        db.rollback()
        return error_generico(e, "cambiar estado de usuario")


# ============================================================
# RESETEAR CONTRASEÑA
# ============================================================
@router.put("/{usuario_id}/password")
def resetear_password(usuario_id: int, data: dict, request: Request, db: Session = Depends(get_db)):
    admin_id = verificar_permiso(request, db, "usuarios", escritura=True)

    try:
        usuario = _one(db, "SELECT id, username FROM usuario WHERE id = :id", {"id": usuario_id})
        if not usuario:
            return {"error": "Usuario no encontrado"}

        password = str(data.get("password", "") or "").strip()
        if len(password) < 6:
            return {"error": "La contraseña debe tener al menos 6 caracteres"}

        db.execute(
            text("UPDATE usuario SET password_hash = crypt(:p, gen_salt('bf')) WHERE id = :id"),
            {"p": password, "id": usuario_id},
        )
        db.commit()

        audit.registrar(
            admin_id, "EDITAR", "usuario", usuario_id,
            detalle=f"Contraseña restablecida para {usuario['username']}",
        )
        return {"ok": True}

    except Exception as e:
        db.rollback()
        return error_generico(e, "restablecer contraseña")


# ============================================================
# DESBLOQUEAR (limpia el contador de intentos fallidos de login)
# ============================================================
@router.post("/{usuario_id}/desbloquear")
def desbloquear(usuario_id: int, request: Request, db: Session = Depends(get_db)):
    admin_id = verificar_permiso(request, db, "usuarios", escritura=True)

    usuario = _one(db, "SELECT id, username FROM usuario WHERE id = :id", {"id": usuario_id})
    if not usuario:
        return {"error": "Usuario no encontrado"}

    _limpiar_intentos(usuario["username"])
    audit.registrar(
        admin_id, "EDITAR", "usuario", usuario_id,
        detalle=f"Desbloqueo de intentos de acceso para {usuario['username']}",
    )
    return {"ok": True}


# ============================================================
# ELIMINAR (solo si no tiene historial de operaciones)
# ============================================================
@router.delete("/{usuario_id}")
def eliminar(usuario_id: int, request: Request, db: Session = Depends(get_db)):
    admin_id = verificar_permiso(request, db, "usuarios", escritura=True)

    try:
        usuario = _one(
            db, "SELECT id, username, empleado_id FROM usuario WHERE id = :id", {"id": usuario_id}
        )
        if not usuario:
            return {"error": "Usuario no encontrado"}

        if _es_ultimo_admin_activo(db, usuario_id):
            return {"error": "Debe quedar al menos un Admin activo. No puedes eliminar el único Admin."}

        db.execute(text("DELETE FROM usuario_rol WHERE usuario_id = :id"), {"id": usuario_id})
        db.execute(text("DELETE FROM usuario WHERE id = :id"), {"id": usuario_id})
        db.execute(text("DELETE FROM empleado WHERE id = :id"), {"id": usuario["empleado_id"]})
        db.commit()

        audit.registrar(
            admin_id, "ELIMINAR", "usuario", usuario_id,
            detalle=f"Eliminación de usuario {usuario['username']}",
        )
        return {"ok": True}

    except IntegrityError:
        db.rollback()
        return {
            "error": "No se puede eliminar: tiene operaciones registradas (ventas, compras, "
                     "bitácora, etc.). Desactívalo en su lugar para conservar el historial."
        }
    except Exception as e:
        db.rollback()
        return error_generico(e, "eliminar usuario")
