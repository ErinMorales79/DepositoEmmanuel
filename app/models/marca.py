from sqlalchemy import Column, BigInteger, Text
from app.database import Base


class Marca(Base):
    __tablename__ = "marca"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(Text, nullable=False, unique=True)
