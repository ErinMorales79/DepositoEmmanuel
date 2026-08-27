from sqlalchemy import Column, BigInteger, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class CuadreRuta(Base):
    __tablename__ = "cuadre_ruta"

    id = Column(BigInteger, primary_key=True, index=True)
    ruta_id = Column(BigInteger, ForeignKey("ruta.id", ondelete="CASCADE"), nullable=False, unique=True)
    cerrado_por = Column(BigInteger, ForeignKey("usuario.id"), nullable=False)
    fecha_hora_cierre = Column(DateTime, server_default=func.now(), nullable=False)
    monto_esperado = Column(Numeric(12, 2), nullable=False)
    monto_recibido = Column(Numeric(12, 2), nullable=False)
    diferencia = Column(Numeric(12, 2), nullable=False)
    observacion = Column(Text)
