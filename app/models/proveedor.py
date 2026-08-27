from sqlalchemy import Column, BigInteger, Text
from app.database import Base


class Proveedor(Base):
    __tablename__ = "proveedor"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(Text, nullable=False, unique=True)
    telefono = Column(Text, nullable=True)
    direccion = Column(Text, nullable=True)
