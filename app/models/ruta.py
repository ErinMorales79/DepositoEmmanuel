from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey
from datetime import datetime
from app.database import Base

class Ruta(Base):
    __tablename__ = "ruta"

    id = Column(Integer, primary_key=True, index=True)
    camion_id = Column(Integer, ForeignKey("camion.id"), nullable=False)
    piloto_id = Column(Integer, ForeignKey("empleado.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)
    estado = Column(
        Enum("ABIERTA", "CERRADA", name="ruta_estado"),
        nullable=False,
        default="ABIERTA"
    )