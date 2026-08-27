from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.auth import get_db, require_login
from app.models.ruta import Ruta
from app.models.ruta_detalle import RutaDetalle
from app.models.producto import Producto


router = APIRouter(tags=["DistribucionWeb"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/distribucion-admin")
def distribucion_admin(request: Request, db: Session = Depends(get_db)):
    require_login(request)

    ruta_activa = (
        db.query(Ruta)
        .filter(Ruta.estado == "ABIERTA")
        .order_by(Ruta.id.desc())
        .first()
    )

    detalle_ruta_json = []
    total_general = 0

    if ruta_activa:
        detalle_raw = (
            db.query(
                RutaDetalle,
                Producto.nombre.label("producto_nombre"),
                Producto.precio_venta.label("precio_venta"),
            )
            .join(Producto, Producto.id == RutaDetalle.producto_id)
            .filter(RutaDetalle.ruta_id == ruta_activa.id)
            .order_by(RutaDetalle.id.asc())
            .all()
        )

        for d, producto_nombre, precio_venta in detalle_raw:
            vendido = d.cantidad_salida - d.cantidad_regreso
            precio_unitario = float(precio_venta or 0)
            subtotal_vendido = vendido * precio_unitario
            total_general += subtotal_vendido

            detalle_ruta_json.append({
                "producto_id": d.producto_id,
                "producto": producto_nombre,
                "salida": d.cantidad_salida,
                "regreso": d.cantidad_regreso,
                "vendido": vendido,
                "precio_unitario": precio_unitario,
                "subtotal_vendido": subtotal_vendido,
            })

    productos = (
        db.query(Producto)
        .filter(Producto.activo == True)
        .order_by(Producto.nombre.asc())
        .all()
    )

    productos_json = [
        {
            "id": p.id,
            "nombre": p.nombre,
            "precio_venta": float(p.precio_venta or 0),
        }
        for p in productos
    ]

    return templates.TemplateResponse(
        request,
        "distribucion.html",
        {
            "ruta_activa": ruta_activa,
            "detalle_ruta_json": detalle_ruta_json,
            "productos_json": productos_json,
            "total_general": total_general,
        }
    )
