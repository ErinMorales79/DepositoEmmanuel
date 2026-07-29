from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base

class RutaDetalle(Base):
    __tablename__ = "ruta_detalle"

    id = Column(Integer, primary_key=True, index=True)
    ruta_id = Column(Integer, ForeignKey("ruta.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("producto.id"), nullable=False)
    cantidad_salida = Column(Integer, nullable=False, default=0)
    cantidad_regreso = Column(Integer, nullable=False, default=0)
