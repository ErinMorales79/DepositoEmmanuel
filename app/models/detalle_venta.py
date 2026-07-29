from sqlalchemy import Column, Integer, Numeric, ForeignKey
from app.database import Base

class DetalleVenta(Base):
    __tablename__ = "detalle_venta"

    id = Column(Integer, primary_key=True, index=True)

    venta_id = Column(Integer, ForeignKey("venta.id"))
    producto_id = Column(Integer, ForeignKey("producto.id"))

    cantidad = Column(Integer, nullable=False)

    precio_unitario = Column(Numeric(12, 2), nullable=False)
    subtotal_linea = Column(Numeric(12, 2), nullable=False)