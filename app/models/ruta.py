from sqlalchemy import Column, BigInteger, Date, Enum, ForeignKey
from app.database import Base


class Ruta(Base):
    __tablename__ = "ruta"

    id = Column(BigInteger, primary_key=True, index=True)
    camion_id = Column(BigInteger, ForeignKey("camion.id"), nullable=False)
    piloto_id = Column(BigInteger, ForeignKey("empleado.id"), nullable=False)
    creada_por = Column(BigInteger, ForeignKey("usuario.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    estado = Column(
        Enum("ABIERTA", "CERRADA", name="ruta_estado", create_type=False),
        nullable=False,
        default="ABIERTA",
    )
