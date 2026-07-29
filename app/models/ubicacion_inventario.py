from sqlalchemy import Column, Integer, String
from app.database import Base

class UbicacionInventario(Base):
    __tablename__ = "ubicacion_inventario"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
