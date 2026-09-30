from datetime import date

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app import audit
from app.auth import get_db, verificar_permiso
from app.errors import error_generico
from app.models.ruta import Ruta
from app.models.ruta_detalle import RutaDetalle
from app.models.producto import Producto
from app.models.lote import Lote
from app.models.inventario_lote import InventarioLote
from app.models.ubicacion_inventario import UbicacionInventario
from app.models.cuadre_ruta import CuadreRuta
from app.models.movimiento_inventario import MovimientoInventario
from app.models.venta import Venta
from app.models.detalle_venta import DetalleVenta

router = APIRouter(prefix="/api/distribucion", tags=["DistribucionAPI"])

NOMBRE_CLIENTE_RUTA = "Ventas de Ruta"


def _cliente_ruta(db: Session) -> int:
    # cliente generico para agrupar todo lo vendido en la ruta
    row = db.execute(
        text("SELECT id FROM cliente WHERE nombre = :n"), {"n": NOMBRE_CLIENTE_RUTA}
    ).first()
    if row:
        return int(row[0])

    row = db.execute(
        text(
            """
            INSERT INTO cliente (nombre, direccion, es_ocasional)
            VALUES (:n, 'Consolidado de ventas en reparto por camión', true)
            RETURNING id
            """
        ),
        {"n": NOMBRE_CLIENTE_RUTA},
    ).first()
    return int(row[0])


def get_ruta_activa(db: Session):
    return (
        db.query(Ruta)
        .filter(Ruta.estado == "ABIERTA")
        .order_by(Ruta.id.desc())
        .first()
    )


def get_ubicacion_id(db: Session, nombre: str):
    ubicacion = (
        db.query(UbicacionInventario)
        .filter(UbicacionInventario.nombre == nombre)
        .first()
    )
    return ubicacion.id if ubicacion else None


def _fifo_lotes(db: Session, producto_id: int, ubicacion_id: int):
    return (
        db.query(Lote)
        .join(InventarioLote, InventarioLote.lote_id == Lote.id)
        .filter(
            Lote.producto_id == producto_id,
            InventarioLote.ubicacion_id == ubicacion_id,
            InventarioLote.cantidad > 0,
        )
        .order_by(Lote.fecha_vencimiento.asc().nulls_last(), Lote.id.asc())
        .all()
    )


def _inv(db: Session, lote_id: int, ubicacion_id: int):
    return (
        db.query(InventarioLote)
        .filter(
            InventarioLote.lote_id == lote_id,
            InventarioLote.ubicacion_id == ubicacion_id,
        )
        .first()
    )


def _sumar_inventario(db: Session, lote_id: int, ubicacion_id: int, cantidad: int):
    destino = _inv(db, lote_id, ubicacion_id)
    if destino:
        destino.cantidad += cantidad
    else:
        db.add(InventarioLote(lote_id=lote_id, ubicacion_id=ubicacion_id, cantidad=cantidad))


def _mover_fifo(db, producto_id, cantidad, origen_id, destino_id, usuario_id, ref_tipo, ref_id, motivo):
    # mueve la cantidad de un lugar a otro, siempre del lote que vence primero
    # (si no hay destino, es una salida normal, como una venta)
    db.flush()  # para que las cantidades esten actualizadas antes de seguir
    restante = cantidad
    for lote in _fifo_lotes(db, producto_id, origen_id):
        if restante <= 0:
            break

        inv_origen = _inv(db, lote.id, origen_id)
        if not inv_origen or inv_origen.cantidad <= 0:
            continue

        tomado = min(restante, inv_origen.cantidad)
        inv_origen.cantidad -= tomado
        restante -= tomado

        if destino_id is not None:
            _sumar_inventario(db, lote.id, destino_id, tomado)

        db.add(
            MovimientoInventario(
                tipo="TRASLADO" if destino_id is not None else "SALIDA",
                usuario_id=usuario_id,
                producto_id=producto_id,
                lote_id=lote.id,
                ubicacion_origen_id=origen_id,
                ubicacion_destino_id=destino_id,
                cantidad=tomado,
                referencia_tipo=ref_tipo,
                referencia_id=ref_id,
                motivo=motivo,
            )
        )

    if restante > 0:
        raise Exception(
            f"Existencia insuficiente para mover el producto {producto_id} (faltan {restante})"
        )


# --- abrir una ruta nueva ---
@router.post("/abrir")
def abrir_ruta(request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "distribucion", escritura=True)

    try:
        ruta_activa = get_ruta_activa(db)
        if ruta_activa:
            return {"error": f"Ya existe una ruta abierta (ID {ruta_activa.id})"}

        camion_id = db.execute(
            text("SELECT id FROM camion ORDER BY id ASC LIMIT 1")
        ).scalar()

        if not camion_id:
            return {"error": "No existe ningún camión registrado en la base de datos"}

        piloto_id = db.execute(
            text("SELECT id FROM empleado WHERE activo = true ORDER BY id ASC LIMIT 1")
        ).scalar()

        if not piloto_id:
            return {"error": "No existe ningún empleado/piloto registrado en la base de datos"}

        ruta = Ruta(
            camion_id=camion_id,
            piloto_id=piloto_id,
            creada_por=usuario_id,
            fecha=date.today(),
            estado="ABIERTA",
        )

        db.add(ruta)
        db.commit()
        db.refresh(ruta)

        audit.registrar(
            usuario_id, "ABRIR", "ruta", ruta.id,
            detalle=f"Ruta RUTA-{ruta.id:04d} abierta con camión #{camion_id}",
        )
        return {"ok": True, "ruta_id": ruta.id}

    except Exception as e:
        db.rollback()
        return error_generico(e)


# --- cargar producto al camion ---
@router.post("/cargar")
def cargar_camion(data: dict, request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "distribucion", escritura=True)

    try:
        ruta = get_ruta_activa(db)
        if not ruta:
            return {"error": "No hay una ruta abierta"}

        producto_id = int(data.get("producto_id", 0))
        cantidad = int(data.get("cantidad", 0))

        if producto_id <= 0:
            return {"error": "Producto inválido"}

        if cantidad <= 0:
            return {"error": "La cantidad debe ser mayor a cero"}

        producto = db.query(Producto).filter(Producto.id == producto_id).first()
        if not producto:
            return {"error": "El producto no existe"}

        bodega_id = get_ubicacion_id(db, "BODEGA")
        camion_id = get_ubicacion_id(db, "CAMION")

        if not bodega_id or not camion_id:
            return {"error": "No existen ubicaciones BODEGA o CAMION"}

        stock_bodega = (
            db.query(func.coalesce(func.sum(InventarioLote.cantidad), 0))
            .join(Lote, InventarioLote.lote_id == Lote.id)
            .filter(
                Lote.producto_id == producto_id,
                InventarioLote.ubicacion_id == bodega_id,
            )
            .scalar()
        )

        if cantidad > int(stock_bodega or 0):
            return {
                "error": f"No hay suficiente stock en bodega. Disponible: {int(stock_bodega or 0)}, requerido: {cantidad}"
            }

        _mover_fifo(
            db, producto_id, cantidad, bodega_id, camion_id, usuario_id,
            "RUTA_CARGA", ruta.id, "Carga de camión",
        )

        detalle = (
            db.query(RutaDetalle)
            .filter(
                RutaDetalle.ruta_id == ruta.id,
                RutaDetalle.producto_id == producto_id,
            )
            .first()
        )

        if detalle:
            detalle.cantidad_salida += cantidad
        else:
            db.add(
                RutaDetalle(
                    ruta_id=ruta.id,
                    producto_id=producto_id,
                    cantidad_salida=cantidad,
                    cantidad_regreso=0,
                )
            )

        db.commit()
        return {"ok": True}

    except Exception as e:
        db.rollback()
        return error_generico(e)


# --- confirmar y cerrar la ruta ---
@router.post("/confirmar")
def confirmar_ruta(data: dict, request: Request, db: Session = Depends(get_db)):
    usuario_id = verificar_permiso(request, db, "distribucion", escritura=True)

    try:
        ruta = get_ruta_activa(db)
        if not ruta:
            return {"error": "No hay una ruta abierta"}

        if db.query(CuadreRuta).filter(CuadreRuta.ruta_id == ruta.id).first():
            return {"error": "Esta ruta ya fue confirmada anteriormente"}

        efectivo_total = float(data.get("efectivo_total", 0))
        items = data.get("items", [])

        if efectivo_total < 0:
            return {"error": "El efectivo total no puede ser negativo"}

        if not items:
            return {"error": "No se recibieron productos para confirmar la ruta"}

        bodega_id = get_ubicacion_id(db, "BODEGA")
        camion_id = get_ubicacion_id(db, "CAMION")

        if not bodega_id or not camion_id:
            return {"error": "No existen ubicaciones BODEGA o CAMION"}

        total_sistema = 0
        lineas_venta: list[dict] = []

        for item in items:
            producto_id = int(item.get("producto_id", 0))
            regreso_final = int(item.get("cantidad_regreso", 0))

            if producto_id <= 0:
                return {"error": "Producto inválido en confirmación"}

            if regreso_final < 0:
                return {"error": "La cantidad de vuelta no puede ser negativa"}

            detalle = (
                db.query(RutaDetalle)
                .filter(
                    RutaDetalle.ruta_id == ruta.id,
                    RutaDetalle.producto_id == producto_id,
                )
                .first()
            )

            if not detalle:
                return {"error": f"El producto {producto_id} no pertenece a la ruta"}

            if regreso_final > detalle.cantidad_salida:
                return {
                    "error": f"La cantidad de vuelta del producto {producto_id} no puede ser mayor a la salida ({detalle.cantidad_salida})"
                }

            if regreso_final < detalle.cantidad_regreso:
                return {
                    "error": f"La cantidad de vuelta del producto {producto_id} no puede ser menor a la ya registrada ({detalle.cantidad_regreso})"
                }

            producto = db.query(Producto).filter(Producto.id == producto_id).first()
            if not producto:
                return {"error": f"El producto {producto_id} no existe"}

            delta_regreso = regreso_final - detalle.cantidad_regreso
            vendido_final = detalle.cantidad_salida - regreso_final
            precio_unitario = float(producto.precio_venta or 0)
            total_sistema += vendido_final * precio_unitario

            if vendido_final > 0:
                lineas_venta.append({
                    "producto_id": producto_id,
                    "cantidad": vendido_final,
                    "precio_unitario": precio_unitario,
                })

            # lo que regreso de verdad, vuelve del camion a la bodega
            if delta_regreso > 0:
                _mover_fifo(
                    db, producto_id, delta_regreso, camion_id, bodega_id, usuario_id,
                    "RUTA_RETORNO", ruta.id, "Regreso a bodega",
                )

            detalle.cantidad_regreso = regreso_final

        # lo que se vendio se descuenta del camion (asi queda en 0)
        for item in items:
            producto_id = int(item.get("producto_id", 0))
            detalle = (
                db.query(RutaDetalle)
                .filter(
                    RutaDetalle.ruta_id == ruta.id,
                    RutaDetalle.producto_id == producto_id,
                )
                .first()
            )
            vendido = detalle.cantidad_salida - detalle.cantidad_regreso
            if vendido > 0:
                _mover_fifo(
                    db, producto_id, vendido, camion_id, None, usuario_id,
                    "RUTA_VENDIDO", ruta.id, "Vendido en ruta (consolidado)",
                )

        # guarda los movimientos antes de revisar el total
        db.flush()

        # el camion tiene que quedar en 0, si no, algo no cuadra
        stock_camion_total = int(
            db.query(func.coalesce(func.sum(InventarioLote.cantidad), 0))
            .filter(InventarioLote.ubicacion_id == camion_id)
            .scalar()
            or 0
        )

        if stock_camion_total > 0:
            raise Exception(
                f"No se puede cerrar la ruta. Aún quedan {stock_camion_total} unidades en el camión."
            )

        correlativo = f"RUTA-{ruta.id:04d}"
        diferencia = efectivo_total - total_sistema

        # se cierra la ruta creando una venta con todo lo que se vendio,
        # mas el cuadre de caja de lo que entrego el chofer
        venta_id = None
        if lineas_venta:
            venta = Venta(
                cliente_id=_cliente_ruta(db),
                usuario_id=usuario_id,
                ruta_id=ruta.id,
                estado="FINALIZADA",
                canal="CAMION",
                subtotal=total_sistema,
                total=total_sistema,
            )
            db.add(venta)
            db.flush()
            venta_id = venta.id

            for linea in lineas_venta:
                db.add(
                    DetalleVenta(
                        venta_id=venta.id,
                        producto_id=linea["producto_id"],
                        cantidad=linea["cantidad"],
                        precio_unitario=linea["precio_unitario"],
                        subtotal_linea=linea["cantidad"] * linea["precio_unitario"],
                    )
                )

        db.add(
            CuadreRuta(
                ruta_id=ruta.id,
                cerrado_por=usuario_id,
                monto_esperado=total_sistema,
                monto_recibido=efectivo_total,
                diferencia=diferencia,
                observacion=correlativo,
            )
        )

        ruta.estado = "CERRADA"

        db.commit()

        audit.registrar(
            usuario_id, "CERRAR", "ruta", ruta.id,
            detalle=(
                f"Ruta {correlativo} cerrada: sistema Q {total_sistema:.2f}, "
                f"recibido Q {efectivo_total:.2f}, diferencia Q {diferencia:.2f}"
            ),
            despues={"venta_id": venta_id, "total_sistema": total_sistema, "efectivo_total": efectivo_total},
        )

        return {
            "ok": True,
            "mensaje": "Ruta confirmada y cerrada correctamente",
            "correlativo": correlativo,
            "efectivo_total": efectivo_total,
            "total_sistema": total_sistema,
            "diferencia": diferencia,
            "venta_id": venta_id,
        }

    except Exception as e:
        db.rollback()
        return error_generico(e)
