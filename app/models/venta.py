from sqlalchemy import Column, BigInteger, DateTime, Numeric, ForeignKey, Enum
from datetime import datetime
from app.database import Base


class Venta(Base):
    __tablename__ = "venta"

    id = Column(BigInteger, primary_key=True, index=True)

    cliente_id = Column(BigInteger, ForeignKey("cliente.id"), nullable=False)
    usuario_id = Column(BigInteger, ForeignKey("usuario.id"), nullable=False)

    fecha_hora = Column(DateTime, default=datetime.now)

    estado = Column(
        Enum("ACTIVA", "ANULADA", "FINALIZADA", name="venta_estado", create_type=False),
        nullable=False,
        default="ACTIVA",
    )
    canal = Column(
        Enum("MOSTRADOR", "MOTO", "CAMION", name="venta_canal", create_type=False),
        nullable=False,
    )

    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)
