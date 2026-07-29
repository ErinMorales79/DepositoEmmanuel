from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class CuadreRuta(Base):
    __tablename__ = "cuadre_ruta"

    id = Column(Integer, primary_key=True, index=True)
    ruta_id = Column(Integer, ForeignKey("ruta.id"), nullable=False, unique=True)
    correlativo = Column(String(20), nullable=False, unique=True)
    efectivo_total = Column(Numeric(12, 2), nullable=False)
    total_sistema = Column(Numeric(12, 2), nullable=False)
    diferencia = Column(Numeric(12, 2), nullable=False)
    fecha_cierre = Column(DateTime, server_default=func.now(), nullable=False)