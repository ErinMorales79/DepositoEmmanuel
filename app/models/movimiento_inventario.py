from sqlalchemy import Column, BigInteger, Integer, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.database import Base


class MovimientoInventario(Base):
    __tablename__ = "movimiento_inventario"

    id = Column(BigInteger, primary_key=True, index=True)
    tipo = Column(
        Enum(
            "INGRESO", "SALIDA", "TRASLADO", "AJUSTE", "DEVOLUCION", "ANULACION",
            name="movimiento_tipo",
            create_type=False,
        ),
        nullable=False,
    )
    fecha_hora = Column(DateTime, server_default=func.now(), nullable=False)
    usuario_id = Column(BigInteger, ForeignKey("usuario.id"), nullable=False)
    producto_id = Column(BigInteger, ForeignKey("producto.id"), nullable=False)
    lote_id = Column(BigInteger, ForeignKey("lote.id"))
    ubicacion_origen_id = Column(BigInteger, ForeignKey("ubicacion_inventario.id"))
    ubicacion_destino_id = Column(BigInteger, ForeignKey("ubicacion_inventario.id"))
    cantidad = Column(Integer, nullable=False)
    referencia_tipo = Column(Text, nullable=False)
    referencia_id = Column(BigInteger, nullable=False)
    motivo = Column(Text)
