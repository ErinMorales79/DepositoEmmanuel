from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import SessionLocal
from app.models.producto import Producto
from app.models.lote import Lote
from app.models.inventario_lote import InventarioLote
from app.schemas.stock import StockBodegaOut

from fastapi import Request
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/stock", tags=["Stock"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/bodega", response_model=list[StockBodegaOut])
def stock_bodega(request: Request, db: Session = Depends(get_db)):

    if not request.session.get("user_id"):
        return RedirectResponse(url="/login", status_code=302)


    resultados = (
        db.query(
            Producto.id.label("producto_id"),
            Producto.nombre.label("producto"),
            func.sum(InventarioLote.cantidad).label("stock")
        )
        .join(Lote, Lote.producto_id == Producto.id)
        .join(InventarioLote, InventarioLote.lote_id == Lote.id)
        .filter(InventarioLote.ubicacion_id == 1)  # BODEGA
        .group_by(Producto.id, Producto.nombre)
        .all()
    )

    return resultados