from sqlalchemy import Column, Integer, String, Numeric, Boolean
from app.database import Base

class Producto(Base):
    __tablename__ = "producto"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio_venta = Column(Numeric(12, 2), nullable=False)
    precio_compra = Column(Numeric(12, 2), nullable=False)
    activo = Column(Boolean, default=True)