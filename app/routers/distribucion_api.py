from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, asc, text

from app.database import SessionLocal
from app.models.ruta import Ruta
from app.models.ruta_detalle import RutaDetalle
from app.models.producto import Producto
from app.models.lote import Lote
from app.models.inventario_lote import InventarioLote
from app.models.ubicacion_inventario import UbicacionInventario
from app.models.cuadre_ruta import CuadreRuta

router = APIRouter(prefix="/api/distribucion", tags=["DistribucionAPI"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_login_api(request: Request):
    if not request.session.get("user_id"):
        raise HTTPException(status_code=401, detail="No autenticado")


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


# ============================================================
# ABRIR RUTA
# ============================================================
@router.post("/abrir")
def abrir_ruta(request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

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
            text("SELECT id FROM empleado ORDER BY id ASC LIMIT 1")
        ).scalar()

        if not piloto_id:
            return {"error": "No existe ningún empleado/piloto registrado en la base de datos"}

        ruta = Ruta(
            camion_id=camion_id,
            piloto_id=piloto_id,
            estado="ABIERTA"
        )

        db.add(ruta)
        db.commit()
        db.refresh(ruta)

        return {"ok": True, "ruta_id": ruta.id}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


# ============================================================
# CARGAR CAMIÓN
# ============================================================
@router.post("/cargar")
def cargar_camion(data: dict, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

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
                InventarioLote.ubicacion_id == bodega_id
            )
            .scalar()
        )

        stock_bodega = int(stock_bodega or 0)

        if cantidad > stock_bodega:
            return {
                "error": f"No hay suficiente stock en bodega. Disponible: {stock_bodega}, requerido: {cantidad}"
            }

        cantidad_por_consumir = cantidad

        lotes = (
            db.query(Lote)
            .join(InventarioLote, InventarioLote.lote_id == Lote.id)
            .filter(
                Lote.producto_id == producto_id,
                InventarioLote.ubicacion_id == bodega_id,
                InventarioLote.cantidad > 0
            )
            .order_by(asc(Lote.id))
            .all()
        )

        for lote in lotes:
            if cantidad_por_consumir <= 0:
                break

            inv_bodega = (
                db.query(InventarioLote)
                .filter(
                    InventarioLote.lote_id == lote.id,
                    InventarioLote.ubicacion_id == bodega_id
                )
                .first()
            )

            if not inv_bodega:
                continue

            if inv_bodega.cantidad >= cantidad_por_consumir:
                movido = cantidad_por_consumir
                inv_bodega.cantidad -= cantidad_por_consumir
                cantidad_por_consumir = 0
            else:
                movido = inv_bodega.cantidad
                cantidad_por_consumir -= inv_bodega.cantidad
                inv_bodega.cantidad = 0

            inv_camion = (
                db.query(InventarioLote)
                .filter(
                    InventarioLote.lote_id == lote.id,
                    InventarioLote.ubicacion_id == camion_id
                )
                .first()
            )

            if inv_camion:
                inv_camion.cantidad += movido
            else:
                db.add(
                    InventarioLote(
                        lote_id=lote.id,
                        ubicacion_id=camion_id,
                        cantidad=movido
                    )
                )

        if cantidad_por_consumir > 0:
            raise Exception("No se pudo completar la carga FIFO")

        detalle = (
            db.query(RutaDetalle)
            .filter(
                RutaDetalle.ruta_id == ruta.id,
                RutaDetalle.producto_id == producto_id
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
                    cantidad_regreso=0
                )
            )

        db.commit()
        return {"ok": True}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


# ============================================================
# CONFIRMAR RUTA
# ============================================================
@router.post("/confirmar")
def confirmar_ruta(data: dict, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    try:
        ruta = get_ruta_activa(db)
        if not ruta:
            return {"error": "No hay una ruta abierta"}

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
                    RutaDetalle.producto_id == producto_id
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

            # Diferencia real que se devuelve en este cierre
            delta_regreso = regreso_final - detalle.cantidad_regreso

            producto = db.query(Producto).filter(Producto.id == producto_id).first()
            if not producto:
                return {"error": f"El producto {producto_id} no existe"}

            vendido_final = detalle.cantidad_salida - regreso_final
            precio_unitario = float(producto.precio_venta or 0)
            total_sistema += vendido_final * precio_unitario

            # SOLO mover a bodega lo que físicamente volvió
            if delta_regreso > 0:
                stock_camion = (
                    db.query(func.coalesce(func.sum(InventarioLote.cantidad), 0))
                    .join(Lote, InventarioLote.lote_id == Lote.id)
                    .filter(
                        Lote.producto_id == producto_id,
                        InventarioLote.ubicacion_id == camion_id
                    )
                    .scalar()
                )

                stock_camion = int(stock_camion or 0)

                if delta_regreso > stock_camion:
                    return {
                        "error": f"No hay suficiente stock en camión para devolver del producto {producto_id}. Disponible: {stock_camion}, requerido: {delta_regreso}"
                    }

                cantidad_por_mover = delta_regreso

                lotes_camion = (
                    db.query(Lote)
                    .join(InventarioLote, InventarioLote.lote_id == Lote.id)
                    .filter(
                        Lote.producto_id == producto_id,
                        InventarioLote.ubicacion_id == camion_id,
                        InventarioLote.cantidad > 0
                    )
                    .order_by(asc(Lote.id))
                    .all()
                )

                for lote in lotes_camion:
                    if cantidad_por_mover <= 0:
                        break

                    inv_camion = (
                        db.query(InventarioLote)
                        .filter(
                            InventarioLote.lote_id == lote.id,
                            InventarioLote.ubicacion_id == camion_id
                        )
                        .first()
                    )

                    if not inv_camion:
                        continue

                    if inv_camion.cantidad >= cantidad_por_mover:
                        movido = cantidad_por_mover
                        inv_camion.cantidad -= cantidad_por_mover
                        cantidad_por_mover = 0
                    else:
                        movido = inv_camion.cantidad
                        cantidad_por_mover -= inv_camion.cantidad
                        inv_camion.cantidad = 0

                    inv_bodega = (
                        db.query(InventarioLote)
                        .filter(
                            InventarioLote.lote_id == lote.id,
                            InventarioLote.ubicacion_id == bodega_id
                        )
                        .first()
                    )

                    if inv_bodega:
                        inv_bodega.cantidad += movido
                    else:
                        db.add(
                            InventarioLote(
                                lote_id=lote.id,
                                ubicacion_id=bodega_id,
                                cantidad=movido
                            )
                        )

                if cantidad_por_mover > 0:
                    raise Exception(f"No se pudo completar la devolución FIFO del producto {producto_id}")

            # Guardar la cantidad final de vuelta confirmada
            detalle.cantidad_regreso = regreso_final

        # Después de devolver lo no vendido, el camión debe quedar vacío
        stock_camion_total = (
            db.query(func.coalesce(func.sum(InventarioLote.cantidad), 0))
            .filter(InventarioLote.ubicacion_id == camion_id)
            .scalar()
        )

        stock_camion_total = int(stock_camion_total or 0)

        if stock_camion_total > 0:
            return {
                "error": f"No se puede cerrar la ruta. Aún quedan {stock_camion_total} unidades en el camión. Debes registrar correctamente la vuelta."
            }

        correlativo = f"RUTA-{ruta.id:04d}"
        diferencia = efectivo_total - total_sistema

        cuadre_existente = (
            db.query(CuadreRuta)
            .filter(CuadreRuta.ruta_id == ruta.id)
            .first()
        )

        if cuadre_existente:
            return {"error": "Esta ruta ya fue confirmada anteriormente"}

        cuadre = CuadreRuta(
            ruta_id=ruta.id,
            correlativo=correlativo,
            efectivo_total=efectivo_total,
            total_sistema=total_sistema,
            diferencia=diferencia
        )
        db.add(cuadre)

        ruta.estado = "CERRADA"

        db.commit()

        return {
            "ok": True,
            "mensaje": "Ruta confirmada y cerrada correctamente",
            "correlativo": correlativo,
            "efectivo_total": efectivo_total,
            "total_sistema": total_sistema,
            "diferencia": diferencia
        }

    except Exception as e:
        db.rollback()
        return {"error": str(e)}
