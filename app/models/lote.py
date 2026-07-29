from sqlalchemy import Column, Integer, Date, Numeric, ForeignKey
from app.database import Base

class Lote(Base):
    __tablename__ = "lote"

    id = Column(Integer, primary_key=True)
    producto_id = Column(Integer, ForeignKey("producto.id"), nullable=False)
    fecha_vencimiento = Column(Date)
    costo_unitario_neto = Column(Numeric(12, 4))
