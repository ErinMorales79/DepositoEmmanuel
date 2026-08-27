from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth import get_db, require_login_api
from app.models.producto import Producto
from app.models.lote import Lote
from app.models.inventario_lote import InventarioLote
from app.schemas.stock import StockBodegaOut

router = APIRouter(prefix="/stock", tags=["Stock"])


@router.get("/bodega", response_model=list[StockBodegaOut])
def stock_bodega(request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    resultados = (
        db.query(
            Producto.id.label("producto_id"),
            Producto.nombre.label("producto"),
            func.coalesce(func.sum(InventarioLote.cantidad), 0).label("stock"),
        )
        .join(Lote, Lote.producto_id == Producto.id)
        .join(InventarioLote, InventarioLote.lote_id == Lote.id)
        .filter(InventarioLote.ubicacion_id == 1)  # BODEGA
        .group_by(Producto.id, Producto.nombre)
        .all()
    )

    return [
        {"producto_id": r.producto_id, "producto": r.producto, "stock": int(r.stock or 0)}
        for r in resultados
    ]
