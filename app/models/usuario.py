from sqlalchemy import Column, BigInteger, Text, Boolean, ForeignKey
from app.database import Base

class Usuario(Base):
    __tablename__ = "usuario"

    id = Column(BigInteger, primary_key=True, index=True)
    empleado_id = Column(BigInteger, ForeignKey("empleado.id"), nullable=False, unique=True)
    username = Column(Text, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    email = Column(Text, nullable=False, unique=True)
