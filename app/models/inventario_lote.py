from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base

class InventarioLote(Base):
    __tablename__ = "inventario_lote"

    id = Column(Integer, primary_key=True)
    lote_id = Column(Integer, ForeignKey("lote.id"), nullable=False)
    ubicacion_id = Column(Integer, nullable=False)
    cantidad = Column(Integer, nullable=False)