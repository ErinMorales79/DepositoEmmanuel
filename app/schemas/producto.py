from pydantic import BaseModel
from decimal import Decimal

class ProductoBase(BaseModel):
    nombre: str
    precio_venta: float   
    precio_compra: float  
    activo: bool

class ProductoOut(ProductoBase):
    id: int

    class Config:
        from_attributes = True