from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List

from app.auth import get_db, require_login_api
from app.models.producto import Producto
from app.schemas.producto import ProductoOut

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("/", response_model=List[ProductoOut])
def listar_productos(request: Request, db: Session = Depends(get_db)):
    require_login_api(request)
    return db.query(Producto).filter(Producto.activo == True).all()
