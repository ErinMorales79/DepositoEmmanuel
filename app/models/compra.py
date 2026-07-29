from sqlalchemy import Column, Integer, DateTime, Numeric, ForeignKey, String
from datetime import datetime
from app.database import Base

class Compra(Base):
    __tablename__ = "compra"

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedor.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    fecha_hora = Column(DateTime, default=datetime.utcnow)
    numero_factura = Column(String, nullable=False)
    total = Column(Numeric(12, 2), default=0)