from sqlalchemy import Column, Integer, String
from app.database import Base

class Camion(Base):
    __tablename__ = "camion"

    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String, nullable=True)
    descripcion = Column(String, nullable=True)