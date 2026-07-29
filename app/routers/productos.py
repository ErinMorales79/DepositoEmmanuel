from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import SessionLocal
from app.models.producto import Producto
from app.schemas.producto import ProductoOut

from fastapi import Request
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/productos", tags=["Productos"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[ProductoOut])

def productos_admin(request: Request, db: Session = Depends(get_db)):

    if not request.session.get("user_id"):
        return RedirectResponse(url="/login", status_code=302)


    return db.query(Producto).filter(Producto.activo == True).all()