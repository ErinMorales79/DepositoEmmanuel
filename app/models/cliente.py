from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base

class Cliente(Base):
    __tablename__ = "cliente"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    direccion = Column(String, nullable=False)
    telefono = Column(String, nullable=True)
    es_ocasional = Column(Boolean, default=False)
    creado_en = Column(DateTime)