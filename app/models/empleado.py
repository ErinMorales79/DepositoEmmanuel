from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class Empleado(Base):
    __tablename__ = "empleado"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    activo = Column(Boolean, nullable=True)
