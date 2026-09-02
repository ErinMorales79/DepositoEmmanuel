"""Módulo de Clientes: alta, edición, listado e historial de compras."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import audit
from app.auth import get_db, verificar_permiso
from app.errors import error_generico

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])


def _rows(db: Session, sql: str, params: dict | None = None) -> list[dict]:
    return [dict(r) for r in db.execute(text(sql), params or {}).mappings().all()]


def _one(db: Session, sql: str, params: dict | None = None) -> dict | None:
    r = db.execute(text(sql), params or {}).mappings().first()
    return dict(r) if r else None


def _leer_datos(data: dict):
    """Valida el payload de cliente. Devuelve (valores, error)."""
    nombre = str(data.get("nombre", "")).strip()
    direccion = str(data.get("direccion", "")).strip()
    telefono = str(data.get("telefono", "") or "").strip() or None
    es_ocasional = bool(data.get("es_ocasional", False))

    if not nombre:
        return None, "El nombre del cliente es obligatorio"
    if len(nombre) > 150:
        return None, "El nombre es demasiado largo"
    if not direccion:
        return None, "La dirección de entrega es obligatoria"

    return {
        "nombre": nombre,
        "direccion": direccion,
        "telefono": telefono,
        "es_ocasional": es_ocasional,
    }, None


# ============================================================
# LISTAR
# ============================================================
@router.get("")
def listar(request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "clientes")
    return _rows(
        db,
        """
        SELECT c.id, c.nombre, c.direccion, COALESCE(c.telefono, '') AS telefono,
               c.es_ocasional,
               to_char(c.creado_en, 'DD/MM/YYYY') AS creado_en,
               COALESCE((
                   SELECT COUNT(*) FROM venta v WHERE v.cliente_id = c.id
               ), 0)::int AS ventas_count,
               COALESCE((
                   SELECT SUM(v.total) FROM venta v
                   WHERE v.cliente_id = c.id AND v.estado = 'FINALIZADA'
               ), 0)::float AS ventas_total
        FROM cliente c
        ORDER BY c.nombre
        """,
    )


# ============================================================
# DETALLE + HISTORIAL DE COMPRAS
# ============================================================
@router.get("/{cliente_id}")
def detalle(cliente_id: int, request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "clientes")

    cliente = _one(
        db,
        """
        SELECT id, nombre, direccion, COALESCE(telefono, '') AS telefono, es_ocasional,
               to_char(creado_en, 'DD/MM/YYYY') AS creado_en
        FROM cliente WHERE id = :id
        """,
        {"id": cliente_id},
    )
    if not cliente:
        return {"error": "Cliente no encontrado"}

    ventas = _rows(
        db,
        """
        SELECT id,
               to_char(fecha_hora, 'DD/MM/YYYY HH24:MI') AS fecha,
               total::float AS total,
               estado::text AS estado,
               canal::text AS canal
        FROM venta
        WHERE cliente_id = :id
        ORDER BY fecha_hora DESC
        """,
        {"id": cliente_id},
    )

    return {"cliente": cliente, "ventas": ventas}


# ============================================================
# CREAR
# ============================================================
@router.post("")
def crear(data: dict, request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "clientes", escritura=True)

    try:
        valores, error = _leer_datos(data)
        if error:
            return {"error": error}

        dup = db.execute(
            text("SELECT id FROM cliente WHERE lower(nombre) = lower(:n)"),
            {"n": valores["nombre"]},
        ).first()
        if dup:
            return {"error": "Ya existe un cliente con ese nombre"}

        row = db.execute(
            text(
                """
                INSERT INTO cliente (nombre, direccion, telefono, es_ocasional)
                VALUES (:nombre, :direccion, :telefono, :es_ocasional)
                RETURNING id
                """
            ),
            valores,
        ).first()
        db.commit()

        cliente_id = int(row[0])
        audit.registrar(
            usuario_id, "CREAR", "cliente", cliente_id,
            detalle=f"Alta de cliente: {valores['nombre']}", despues=valores,
        )
        return {"ok": True, "cliente_id": cliente_id}

    except Exception as e:
        db.rollback()
        return error_generico(e, "crear cliente")


# ============================================================
# EDITAR
# ============================================================
@router.put("/{cliente_id}")
def editar(cliente_id: int, data: dict, request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "clientes", escritura=True)

    try:
        existe = db.execute(text("SELECT id FROM cliente WHERE id = :id"), {"id": cliente_id}).first()
        if not existe:
            return {"error": "Cliente no encontrado"}

        valores, error = _leer_datos(data)
        if error:
            return {"error": error}

        dup = db.execute(
            text("SELECT id FROM cliente WHERE lower(nombre) = lower(:n) AND id != :id"),
            {"n": valores["nombre"], "id": cliente_id},
        ).first()
        if dup:
            return {"error": "Ya existe otro cliente con ese nombre"}

        db.execute(
            text(
                """
                UPDATE cliente
                SET nombre = :nombre, direccion = :direccion,
                    telefono = :telefono, es_ocasional = :es_ocasional
                WHERE id = :id
                """
            ),
            {**valores, "id": cliente_id},
        )
        db.commit()

        audit.registrar(
            usuario_id, "EDITAR", "cliente", cliente_id,
            detalle=f"Edición de cliente: {valores['nombre']}", despues=valores,
        )
        return {"ok": True}

    except Exception as e:
        db.rollback()
        return error_generico(e, "editar cliente")


# ============================================================
# ELIMINAR (solo si no tiene ventas asociadas)
# ============================================================
@router.delete("/{cliente_id}")
def eliminar(cliente_id: int, request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "clientes", escritura=True)

    try:
        cliente = db.execute(
            text("SELECT nombre FROM cliente WHERE id = :id"), {"id": cliente_id}
        ).first()
        if not cliente:
            return {"error": "Cliente no encontrado"}

        tiene_ventas = db.execute(
            text("SELECT 1 FROM venta WHERE cliente_id = :id LIMIT 1"), {"id": cliente_id}
        ).first()
        if tiene_ventas:
            return {
                "error": "No se puede eliminar: el cliente tiene ventas registradas. "
                         "Puedes editar sus datos en su lugar."
            }

        db.execute(text("DELETE FROM cliente WHERE id = :id"), {"id": cliente_id})
        db.commit()

        audit.registrar(
            usuario_id, "ELIMINAR", "cliente", cliente_id,
            detalle=f"Eliminación de cliente: {cliente[0]}",
        )
        return {"ok": True}

    except Exception as e:
        db.rollback()
        return error_generico(e, "eliminar cliente")
