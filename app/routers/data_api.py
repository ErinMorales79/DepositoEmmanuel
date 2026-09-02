"""Endpoints de lectura para el frontend (SPA React).

Todo lo que consume el frontend para *mostrar* datos. Las mutaciones
(crear venta, compra, producto, operar rutas) viven en `api.py` y
`distribucion_api.py`.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import get_db, require_login_api, verificar_permiso

router = APIRouter(prefix="/api", tags=["Datos"])

# Rango por defecto de los reportes: últimos 120 días (cubre los datos de ejemplo)
_DESDE = str(date.today() - timedelta(days=120))
_HASTA = str(date.today())


def _rows(db: Session, sql: str, params: dict | None = None) -> list[dict]:
    return [dict(r) for r in db.execute(text(sql), params or {}).mappings().all()]


def _one(db: Session, sql: str, params: dict | None = None) -> dict | None:
    r = db.execute(text(sql), params or {}).mappings().first()
    return dict(r) if r else None


# ============================================================
# RESUMEN (píldoras de la barra superior)
# ============================================================
@router.get("/resumen")
def resumen(request: Request, db: Session = Depends(get_db)):
    require_login_api(request)
    v = _one(
        db,
        """
        SELECT COALESCE(SUM(total), 0)::float AS total, COUNT(*)::int AS count
        FROM venta WHERE estado = 'FINALIZADA'
        """,
    )
    c = _one(
        db,
        """
        SELECT COALESCE(SUM(total), 0)::float AS total, COUNT(*)::int AS count
        FROM compra WHERE estado = 'FINALIZADA'
        """,
    )
    ultima = _one(db, "SELECT to_char(MAX(fecha_hora), 'DD/MM/YYYY') AS f FROM venta")
    return {"ventas": v, "compras": c, "ultima_venta": ultima["f"] if ultima else None}


# ============================================================
# DASHBOARD
# ============================================================
@router.get("/dashboard")
def dashboard(request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    prod = _one(
        db,
        """
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE activo)::int AS activos
        FROM producto
        """,
    )

    unidades_bodega = db.execute(
        text(
            """
            SELECT COALESCE(SUM(il.cantidad), 0)::int
            FROM inventario_lote il
            JOIN ubicacion_inventario u ON u.id = il.ubicacion_id
            WHERE u.nombre = 'BODEGA'
            """
        )
    ).scalar()

    bajo_minimo = _rows(
        db,
        """
        SELECT p.id, p.nombre, p.stock_minimo AS minimo,
               COALESCE((
                   SELECT SUM(il.cantidad)
                   FROM inventario_lote il
                   JOIN lote l ON l.id = il.lote_id
                   JOIN ubicacion_inventario u ON u.id = il.ubicacion_id
                   WHERE l.producto_id = p.id AND u.nombre = 'BODEGA'
               ), 0)::int AS stock
        FROM producto p
        WHERE p.activo
        """,
    )
    bajo_minimo = [b for b in bajo_minimo if b["stock"] <= b["minimo"]]

    ruta = _one(
        db,
        """
        SELECT r.id, e.nombre AS piloto, c.placa AS camion, r.estado::text AS estado
        FROM ruta r
        JOIN empleado e ON e.id = r.piloto_id
        JOIN camion c ON c.id = r.camion_id
        WHERE r.estado = 'ABIERTA'
        ORDER BY r.id DESC LIMIT 1
        """,
    )
    if ruta:
        ruta["correlativo"] = f"RUTA-{ruta['id']:04d}"

    movimientos = _rows(
        db,
        """
        SELECT to_char(m.fecha_hora, 'HH24:MI') AS hora,
               to_char(m.fecha_hora, 'DD/MM')   AS fecha,
               m.tipo::text                     AS tipo,
               p.nombre                         AS producto,
               m.cantidad                       AS cantidad,
               (m.referencia_tipo || '-' || m.referencia_id) AS referencia
        FROM movimiento_inventario m
        JOIN producto p ON p.id = m.producto_id
        ORDER BY m.fecha_hora DESC, m.id DESC
        LIMIT 8
        """,
    )

    ubicaciones = _rows(
        db,
        """
        SELECT u.nombre,
               COALESCE(SUM(il.cantidad), 0)::int AS unidades
        FROM ubicacion_inventario u
        LEFT JOIN inventario_lote il ON il.ubicacion_id = u.id
        GROUP BY u.id, u.nombre
        ORDER BY u.id
        """,
    )
    notas = {
        "BODEGA": "Existencia principal",
        "CAMION": "Reparto en camión",
        "MOTO": "Reparto en moto",
    }
    for u in ubicaciones:
        u["nota"] = notas.get(u["nombre"], "")

    return {
        "productos_activos": prod["activos"],
        "productos_total": prod["total"],
        "unidades_bodega": int(unidades_bodega or 0),
        "bajo_minimo": bajo_minimo,
        "ruta_activa": ruta,
        "movimientos": movimientos,
        "ubicaciones": ubicaciones,
    }


# ============================================================
# CATÁLOGOS (selects de formularios)
# ============================================================
@router.get("/catalogos")
def catalogos(request: Request, db: Session = Depends(get_db)):
    require_login_api(request)
    return {
        "marcas": _rows(db, "SELECT id, nombre FROM marca ORDER BY nombre"),
        "proveedores": _rows(db, "SELECT id, nombre FROM proveedor ORDER BY nombre"),
        "clientes": _rows(
            db,
            "SELECT id, nombre, COALESCE(direccion, '') AS direccion FROM cliente ORDER BY nombre",
        ),
        "ubicaciones": _rows(db, "SELECT id, nombre FROM ubicacion_inventario ORDER BY id"),
    }


# ============================================================
# PRODUCTOS
# ============================================================
@router.get("/productos")
def productos(request: Request, db: Session = Depends(get_db)):
    require_login_api(request)
    return _rows(
        db,
        """
        SELECT p.id, p.codigo_barra, p.nombre,
               p.marca_id, m.nombre AS marca,
               p.proveedor_id, pr.nombre AS proveedor,
               p.unidades_por_fardo,
               p.precio_compra::float AS precio_compra,
               p.precio_venta::float  AS precio_venta,
               p.es_retornable, p.requiere_vencimiento,
               p.stock_minimo, p.activo,
               COALESCE((
                   SELECT SUM(il.cantidad)
                   FROM inventario_lote il
                   JOIN lote l ON l.id = il.lote_id
                   JOIN ubicacion_inventario u ON u.id = il.ubicacion_id
                   WHERE l.producto_id = p.id AND u.nombre = 'BODEGA'
               ), 0)::int AS stock
        FROM producto p
        JOIN marca m ON m.id = p.marca_id
        JOIN proveedor pr ON pr.id = p.proveedor_id
        ORDER BY p.id DESC
        """,
    )


# ============================================================
# STOCK
# ============================================================
@router.get("/stock")
def stock(request: Request, db: Session = Depends(get_db)):
    require_login_api(request)
    resumen = _rows(
        db,
        """
        SELECT p.id AS producto_id, p.nombre AS producto, p.stock_minimo AS minimo,
               COALESCE((
                   SELECT SUM(il.cantidad)
                   FROM inventario_lote il
                   JOIN lote l ON l.id = il.lote_id
                   JOIN ubicacion_inventario u ON u.id = il.ubicacion_id
                   WHERE l.producto_id = p.id AND u.nombre = 'BODEGA'
               ), 0)::int AS stock
        FROM producto p
        ORDER BY p.nombre
        """,
    )
    lotes = _rows(
        db,
        """
        SELECT l.id AS lote_id, p.nombre AS producto,
               COALESCE(l.fecha_vencimiento::text, '') AS vence,
               il.cantidad AS cantidad, u.nombre AS ubicacion
        FROM inventario_lote il
        JOIN lote l ON l.id = il.lote_id
        JOIN producto p ON p.id = l.producto_id
        JOIN ubicacion_inventario u ON u.id = il.ubicacion_id
        WHERE il.cantidad > 0
        ORDER BY p.nombre, l.id
        """,
    )
    return {"resumen": resumen, "lotes": lotes}


@router.get("/stock/{producto_id}")
def stock_producto(producto_id: int, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)
    n = db.execute(
        text(
            """
            SELECT COALESCE(SUM(il.cantidad), 0)::int
            FROM inventario_lote il
            JOIN lote l ON l.id = il.lote_id
            JOIN ubicacion_inventario u ON u.id = il.ubicacion_id
            WHERE l.producto_id = :pid AND u.nombre = 'BODEGA'
            """
        ),
        {"pid": producto_id},
    ).scalar()
    return {"stock": int(n or 0)}


# ============================================================
# VENTAS / COMPRAS (listas)
# ============================================================
@router.get("/ventas")
def ventas(request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "ventas")
    return _rows(
        db,
        """
        SELECT v.id,
               to_char(v.fecha_hora, 'DD/MM/YYYY HH24:MI') AS fecha,
               v.fecha_hora::date::text                    AS "fechaISO",
               c.nombre                                    AS cliente,
               v.total::float                              AS total,
               v.estado::text                              AS estado,
               v.canal::text                               AS canal
        FROM venta v
        JOIN cliente c ON c.id = v.cliente_id
        ORDER BY v.id DESC
        """,
    )


@router.get("/compras")
def compras(request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "compras")
    return _rows(
        db,
        """
        SELECT co.id,
               to_char(co.fecha_hora, 'DD/MM/YYYY HH24:MI') AS fecha,
               co.fecha_hora::date::text                    AS "fechaISO",
               pr.nombre                                    AS proveedor,
               COALESCE(co.numero_factura, '—')             AS factura,
               co.total::float                              AS total,
               co.estado::text                              AS estado
        FROM compra co
        JOIN proveedor pr ON pr.id = co.proveedor_id
        ORDER BY co.id DESC
        """,
    )


# ============================================================
# DISTRIBUCIÓN (ruta activa)
# ============================================================
@router.get("/distribucion")
def distribucion(request: Request, db: Session = Depends(get_db)):
    verificar_permiso(request, db, "distribucion")
    ruta = _one(
        db,
        """
        SELECT r.id, r.estado::text AS estado,
               e.nombre AS piloto, c.placa AS camion,
               to_char(r.fecha, 'DD/MM/YYYY') AS fecha
        FROM ruta r
        JOIN empleado e ON e.id = r.piloto_id
        JOIN camion c ON c.id = r.camion_id
        WHERE r.estado = 'ABIERTA'
        ORDER BY r.id DESC LIMIT 1
        """,
    )
    detalle = []
    if ruta:
        ruta["correlativo"] = f"RUTA-{ruta['id']:04d}"
        detalle = _rows(
            db,
            """
            SELECT rd.producto_id, p.nombre AS producto,
                   rd.cantidad_salida AS salida,
                   rd.cantidad_regreso AS regreso,
                   p.precio_venta::float AS precio
            FROM ruta_detalle rd
            JOIN producto p ON p.id = rd.producto_id
            WHERE rd.ruta_id = :rid
            ORDER BY rd.id
            """,
            {"rid": ruta["id"]},
        )
    return {"ruta_activa": ruta, "detalle": detalle}


# ============================================================
# REPORTES
# ============================================================
def _por_dia(rows: list[dict], campo: str = "total") -> list[dict]:
    agg: dict[str, float] = {}
    for r in rows:
        k = r["fechaISO"]
        agg[k] = agg.get(k, 0) + float(r[campo])
    return [{"label": k[8:], "value": v} for k, v in sorted(agg.items())]


@router.get("/reportes/ventas")
def reporte_ventas(
    request: Request,
    db: Session = Depends(get_db),
    desde: str = Query(_DESDE),
    hasta: str = Query(_HASTA),
    cliente: str = Query("Todos"),
    canal: str = Query("Todos"),
    estado: str = Query("Todos"),
):
    verificar_permiso(request, db, "reportes")
    rows = _rows(
        db,
        """
        SELECT v.id,
               to_char(v.fecha_hora, 'DD/MM/YYYY HH24:MI') AS fecha,
               v.fecha_hora::date::text                    AS "fechaISO",
               c.nombre                                    AS cliente,
               v.canal::text                               AS canal,
               v.estado::text                              AS estado,
               v.total::float                              AS total
        FROM venta v
        JOIN cliente c ON c.id = v.cliente_id
        WHERE v.fecha_hora::date BETWEEN :desde AND :hasta
          AND (:cliente = 'Todos' OR c.nombre = :cliente)
          AND (:canal = 'Todos' OR v.canal::text = :canal)
          AND (:estado = 'Todos' OR v.estado::text = :estado)
        ORDER BY v.fecha_hora DESC
        """,
        {"desde": desde, "hasta": hasta, "cliente": cliente, "canal": canal, "estado": estado},
    )
    fin = [r for r in rows if r["estado"] == "FINALIZADA"]
    total = sum(r["total"] for r in fin)
    return {
        "rows": rows,
        "resumen": {
            "count": len(rows),
            "total_finalizado": total,
            "ticket_promedio": (total / len(fin)) if fin else 0,
            "anuladas": sum(1 for r in rows if r["estado"] == "ANULADA"),
        },
        "por_dia": _por_dia(fin),
    }


@router.get("/reportes/compras")
def reporte_compras(
    request: Request,
    db: Session = Depends(get_db),
    desde: str = Query(_DESDE),
    hasta: str = Query(_HASTA),
    proveedor: str = Query("Todos"),
    estado: str = Query("Todos"),
):
    verificar_permiso(request, db, "reportes")
    rows = _rows(
        db,
        """
        SELECT co.id,
               to_char(co.fecha_hora, 'DD/MM/YYYY HH24:MI') AS fecha,
               co.fecha_hora::date::text                    AS "fechaISO",
               pr.nombre                                    AS proveedor,
               COALESCE(co.numero_factura, '—')             AS factura,
               co.estado::text                              AS estado,
               co.total::float                              AS total
        FROM compra co
        JOIN proveedor pr ON pr.id = co.proveedor_id
        WHERE co.fecha_hora::date BETWEEN :desde AND :hasta
          AND (:proveedor = 'Todos' OR pr.nombre = :proveedor)
          AND (:estado = 'Todos' OR co.estado::text = :estado)
        ORDER BY co.fecha_hora DESC
        """,
        {"desde": desde, "hasta": hasta, "proveedor": proveedor, "estado": estado},
    )
    total = sum(r["total"] for r in rows)
    return {
        "rows": rows,
        "resumen": {
            "count": len(rows),
            "total": total,
            "promedio": (total / len(rows)) if rows else 0,
            "proveedores": len({r["proveedor"] for r in rows}),
        },
        "por_dia": _por_dia(rows),
    }


@router.get("/reportes/rutas")
def reporte_rutas(
    request: Request,
    db: Session = Depends(get_db),
    desde: str = Query(_DESDE),
    hasta: str = Query(_HASTA),
    piloto: str = Query("Todos"),
    estado: str = Query("Todos"),
):
    verificar_permiso(request, db, "reportes")
    rows = _rows(
        db,
        """
        SELECT r.id,
               ('RUTA-' || lpad(r.id::text, 4, '0'))        AS correlativo,
               to_char(r.fecha, 'DD/MM/YYYY')               AS fecha,
               r.fecha::text                                AS "fechaISO",
               e.nombre                                     AS piloto,
               c.placa                                      AS camion,
               r.estado::text                               AS estado,
               COALESCE(SUM(rd.cantidad_salida), 0)::int    AS "unidadesSalida",
               COALESCE(SUM(rd.cantidad_salida - rd.cantidad_regreso), 0)::int AS "unidadesVendidas",
               COALESCE(cr.monto_esperado, 0)::float        AS "totalSistema",
               COALESCE(cr.monto_recibido, 0)::float        AS efectivo,
               COALESCE(cr.diferencia, 0)::float            AS diferencia
        FROM ruta r
        JOIN empleado e ON e.id = r.piloto_id
        JOIN camion c ON c.id = r.camion_id
        LEFT JOIN ruta_detalle rd ON rd.ruta_id = r.id
        LEFT JOIN cuadre_ruta cr ON cr.ruta_id = r.id
        WHERE r.fecha BETWEEN :desde AND :hasta
          AND (:piloto = 'Todos' OR e.nombre = :piloto)
          AND (:estado = 'Todos' OR r.estado::text = :estado)
        GROUP BY r.id, e.nombre, c.placa, r.estado, r.fecha,
                 cr.monto_esperado, cr.monto_recibido, cr.diferencia
        ORDER BY r.fecha DESC, r.id DESC
        """,
        {"desde": desde, "hasta": hasta, "piloto": piloto, "estado": estado},
    )
    cerradas = [r for r in rows if r["estado"] == "CERRADA"]
    return {
        "rows": rows,
        "resumen": {
            "count": len(rows),
            "unidades": sum(r["unidadesVendidas"] for r in rows),
            "total_sistema": sum(r["totalSistema"] for r in rows),
            "diferencia": sum(r["efectivo"] - r["totalSistema"] for r in cerradas),
        },
    }
