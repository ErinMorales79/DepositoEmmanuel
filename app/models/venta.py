from sqlalchemy import Column, Integer, DateTime, Numeric, ForeignKey, Enum
from datetime import datetime
from app.database import Base

class Venta(Base):
    __tablename__ = "venta"

    id = Column(Integer, primary_key=True, index=True)

    cliente_id = Column(Integer, ForeignKey("cliente.id"))
    usuario_id = Column(Integer, ForeignKey("usuario.id"))

    fecha_hora = Column(DateTime, default=datetime.utcnow)

    #ENUM correctos
    estado = Column(Enum("ACTIVA", "ANULADA", "FINALIZADA", name="venta_estado"))
    canal = Column(Enum("MOSTRADOR", "CAMION", name="venta_canal"))

    subtotal = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), default=0)
