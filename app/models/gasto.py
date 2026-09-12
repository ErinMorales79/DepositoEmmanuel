from sqlalchemy import Column, BigInteger, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Gasto(Base):
    """Gasto operativo del negocio (alquiler, sueldos, combustible, luz, agua...).

    Alimenta el módulo Contabilidad: sin esto solo se puede calcular la
    ganancia BRUTA, no la utilidad neta real del negocio.
    """

    __tablename__ = "gasto"

    id = Column(BigInteger, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, server_default=func.current_date())
    categoria = Column(Text, nullable=False)  # ALQUILER/SUELDOS/COMBUSTIBLE/LUZ/AGUA/OTRO
    descripcion = Column(Text, nullable=False)
    monto = Column(Numeric(12, 2), nullable=False)
    numero_factura = Column(Text)
    registrado_por = Column(BigInteger, ForeignKey("usuario.id"), nullable=False)
    creado_en = Column(DateTime, server_default=func.now(), nullable=False)
