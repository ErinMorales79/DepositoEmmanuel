from sqlalchemy import Column, BigInteger, Integer, Text, Numeric, Boolean, ForeignKey
from app.database import Base


class Producto(Base):
    __tablename__ = "producto"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo_barra = Column(Text, nullable=False, unique=True)
    nombre = Column(Text, nullable=False, unique=True)
    marca_id = Column(BigInteger, ForeignKey("marca.id"), nullable=False)
    proveedor_id = Column(BigInteger, ForeignKey("proveedor.id"), nullable=False)
    unidades_por_fardo = Column(Integer, nullable=False, default=1)
    precio_venta = Column(Numeric(12, 2), nullable=False)
    precio_compra = Column(Numeric(12, 2), nullable=False)
    es_retornable = Column(Boolean, nullable=False, default=False)
    requiere_vencimiento = Column(Boolean, nullable=False, default=True)
    stock_minimo = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)
