# modulo de contabilidad: impuesto de la SAT, ganancia bruta/neta, margenes y gastos
#
# el negocio es Pequeño Contribuyente, entonces el impuesto siempre es
# 5% de lo vendido (sin importar el margen de cada producto), y los precios
# ya vienen con impuesto incluido, no hay que restarle nada
#
# el detalle de por que se calcula asi esta en docs/contabilidad_sat_briefing.md

from datetime import date

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import audit
from app.auth import get_db, verificar_permiso
from app.errors import error_generico

router = APIRouter(prefix="/api/contabilidad", tags=["Contabilidad"])

TASA_SAT = 0.05  # 5% fijo sobre el total vendido
CATEGORIAS = {"ALQUILER", "SUELDOS", "COMBUSTIBLE", "LUZ", "AGUA", "OTRO"}


def _rows(db: Session, sql: str, params: dict | None = None) -> list[dict]:
    return [dict(r) for r in db.execute(text(sql), params or {}).mappings().all()]


def _one(db: Session, sql: str, params: dict | None = None) -> dict | None:
    r = db.execute(text(sql), params or {}).mappings().first()
    return dict(r) if r else None


def _rango(desde: str | None, hasta: str | None) -> dict:
    # si no mandan fechas, usa el mes actual completo
    hoy = date.today()
    return {
        "desde": desde or hoy.replace(day=1).isoformat(),
        "hasta": hasta or hoy.isoformat(),
    }


# --- resumen: total vendido, gastos, ganancia e impuesto ---
@router.get("/resumen")
def resumen(request: Request, db: Session = Depends(get_db), desde: str | None = None, hasta: str | None = None):
    verificar_permiso(request, db, "contabilidad")
    r = _rango(desde, hasta)

    ventas = _one(
        db,
        """
        SELECT COALESCE(SUM(total), 0)::float AS total, COUNT(*)::int AS count
        FROM venta
        WHERE estado = 'FINALIZADA' AND fecha_hora::date BETWEEN :desde AND :hasta
        """,
        r,
    )

    compras = _one(
        db,
        """
        SELECT COALESCE(SUM(total), 0)::float AS total, COUNT(*)::int AS count
        FROM compra
        WHERE estado = 'FINALIZADA' AND fecha_hora::date BETWEEN :desde AND :hasta
        """,
        r,
    )

    costo = _one(
        db,
        """
        SELECT COALESCE(SUM(dv.cantidad * p.precio_compra), 0)::float AS total
        FROM detalle_venta dv
        JOIN venta v ON v.id = dv.venta_id
        JOIN producto p ON p.id = dv.producto_id
        WHERE v.estado = 'FINALIZADA' AND v.fecha_hora::date BETWEEN :desde AND :hasta
        """,
        r,
    )

    gastos = _one(
        db,
        """
        SELECT COALESCE(SUM(monto), 0)::float AS total, COUNT(*)::int AS count
        FROM gasto
        WHERE fecha BETWEEN :desde AND :hasta
        """,
        r,
    )

    ventas_total = ventas["total"]
    costo_vendido = costo["total"]
    gastos_total = gastos["total"]

    ganancia_bruta = ventas_total - costo_vendido
    margen_bruto_pct = (ganancia_bruta / ventas_total * 100) if ventas_total else 0.0

    impuesto_sat = round(ventas_total * TASA_SAT, 2)
    utilidad_operativa = ganancia_bruta - gastos_total
    utilidad_neta = utilidad_operativa - impuesto_sat
    margen_neto_pct = (utilidad_neta / ventas_total * 100) if ventas_total else 0.0

    return {
        "rango": r,
        "ventas": ventas,
        "compras": compras,
        "costo_vendido": costo_vendido,
        "ganancia_bruta": ganancia_bruta,
        "margen_bruto_pct": round(margen_bruto_pct, 1),
        "gastos_operativos": gastos_total,
        "gastos_count": gastos["count"],
        "utilidad_operativa": utilidad_operativa,
        "tasa_sat": TASA_SAT,
        "impuesto_sat": impuesto_sat,
        "utilidad_neta": utilidad_neta,
        "margen_neto_pct": round(margen_neto_pct, 1),
    }


# --- margen de ganancia de cada producto ---
@router.get("/productos")
def margenes_por_producto(request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "contabilidad")
    return _rows(
        db,
        """
        SELECT id, nombre,
               precio_compra::float AS precio_compra,
               precio_venta::float  AS precio_venta,
               (precio_venta - precio_compra)::float AS ganancia_unitaria,
               CASE WHEN precio_venta > 0
                    THEN ROUND(((precio_venta - precio_compra) / precio_venta * 100)::numeric, 1)
                    ELSE 0
               END AS margen_pct
        FROM producto
        WHERE activo = true
        ORDER BY margen_pct DESC
        """,
    )


# --- libro de ventas (el reporte que pide la contadora) ---
@router.get("/libro-ventas")
def libro_ventas(request: Request, db: Session = Depends(get_db), desde: str | None = None, hasta: str | None = None):
    verificar_permiso(request, db, "contabilidad")
    r = _rango(desde, hasta)
    filas = _rows(
        db,
        """
        SELECT v.id,
               to_char(v.fecha_hora, 'DD/MM/YYYY') AS fecha,
               COALESCE(c.nombre, 'Consumidor Final') AS cliente,
               v.canal::text AS canal,
               v.total::float AS total,
               ROUND((v.total * :tasa)::numeric, 2)::float AS impuesto
        FROM venta v
        LEFT JOIN cliente c ON c.id = v.cliente_id
        WHERE v.estado = 'FINALIZADA' AND v.fecha_hora::date BETWEEN :desde AND :hasta
        ORDER BY v.fecha_hora DESC
        """,
        {**r, "tasa": TASA_SAT},
    )
    total = sum(f["total"] for f in filas)
    impuesto = round(total * TASA_SAT, 2)
    return {"rango": r, "rows": filas, "resumen": {"count": len(filas), "total": total, "impuesto": impuesto}}


# --- gastos del negocio (el Admin puede escribir, el Contador solo mira) ---
def _leer_gasto(data: dict):
    categoria = str(data.get("categoria", "")).strip().upper()
    descripcion = str(data.get("descripcion", "")).strip()
    numero_factura = str(data.get("numero_factura", "") or "").strip() or None
    fecha = str(data.get("fecha", "") or "").strip() or date.today().isoformat()

    try:
        monto = float(data.get("monto", 0))
    except (TypeError, ValueError):
        return None, "El monto no es válido"

    if categoria not in CATEGORIAS:
        return None, "Categoría inválida"
    if not descripcion:
        return None, "La descripción es obligatoria"
    if monto <= 0:
        return None, "El monto debe ser mayor a cero"

    return {
        "fecha": fecha,
        "categoria": categoria,
        "descripcion": descripcion,
        "monto": monto,
        "numero_factura": numero_factura,
    }, None


@router.get("/gastos")
def listar_gastos(request: Request, db: Session = Depends(get_db), desde: str | None = None, hasta: str | None = None):
    verificar_permiso(request, db, "contabilidad")
    r = _rango(desde, hasta)
    return _rows(
        db,
        """
        SELECT g.id, to_char(g.fecha, 'YYYY-MM-DD') AS fecha, g.categoria,
               g.descripcion, g.monto::float AS monto,
               COALESCE(g.numero_factura, '') AS numero_factura,
               e.nombre AS registrado_por
        FROM gasto g
        JOIN usuario u ON u.id = g.registrado_por
        JOIN empleado e ON e.id = u.empleado_id
        WHERE g.fecha BETWEEN :desde AND :hasta
        ORDER BY g.fecha DESC, g.id DESC
        """,
        r,
    )


@router.post("/gastos")
def crear_gasto(data: dict, request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "contabilidad", escritura=True)

    try:
        # revisa que los datos del gasto vengan bien antes de guardarlo
        valores, error = _leer_gasto(data)
        if error:
            return {"error": error}

        row = db.execute(
            text(
                """
                INSERT INTO gasto (fecha, categoria, descripcion, monto, numero_factura, registrado_por)
                VALUES (:fecha, :categoria, :descripcion, :monto, :numero_factura, :usuario_id)
                RETURNING id
                """
            ),
            {**valores, "usuario_id": usuario_id},
        ).first()
        db.commit()

        gasto_id = int(row[0])
        audit.registrar(
            usuario_id, "CREAR", "gasto", gasto_id,
            detalle=f"Gasto {valores['categoria']}: Q {valores['monto']:.2f}", despues=valores,
        )
        return {"ok": True, "gasto_id": gasto_id}

    except Exception as e:
        db.rollback()
        return error_generico(e, "crear gasto")


@router.put("/gastos/{gasto_id}")
def editar_gasto(gasto_id: int, data: dict, request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "contabilidad", escritura=True)

    try:
        existe = db.execute(text("SELECT id FROM gasto WHERE id = :id"), {"id": gasto_id}).first()
        if not existe:
            return {"error": "Gasto no encontrado"}

        valores, error = _leer_gasto(data)
        if error:
            return {"error": error}

        db.execute(
            text(
                """
                UPDATE gasto
                SET fecha = :fecha, categoria = :categoria, descripcion = :descripcion,
                    monto = :monto, numero_factura = :numero_factura
                WHERE id = :id
                """
            ),
            {**valores, "id": gasto_id},
        )
        db.commit()

        audit.registrar(
            usuario_id, "EDITAR", "gasto", gasto_id,
            detalle=f"Edición de gasto: Q {valores['monto']:.2f}", despues=valores,
        )
        return {"ok": True}

    except Exception as e:
        db.rollback()
        return error_generico(e, "editar gasto")


@router.delete("/gastos/{gasto_id}")
def eliminar_gasto(gasto_id: int, request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "contabilidad", escritura=True)

    try:
        gasto = db.execute(text("SELECT descripcion FROM gasto WHERE id = :id"), {"id": gasto_id}).first()
        if not gasto:
            return {"error": "Gasto no encontrado"}

        db.execute(text("DELETE FROM gasto WHERE id = :id"), {"id": gasto_id})
        db.commit()

        audit.registrar(
            usuario_id, "ELIMINAR", "gasto", gasto_id,
            detalle=f"Eliminación de gasto: {gasto[0]}",
        )
        return {"ok": True}

    except Exception as e:
        db.rollback()
        return error_generico(e, "eliminar gasto")
