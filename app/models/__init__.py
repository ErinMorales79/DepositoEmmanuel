"""Importa todos los modelos para que SQLAlchemy resuelva las relaciones/FK.

Importar `app.models` (o cualquier submódulo) deja el metadata completo,
sin importar el orden en que los routers carguen sus modelos.
"""

from app.models.marca import Marca
from app.models.proveedor import Proveedor
from app.models.producto import Producto
from app.models.cliente import Cliente
from app.models.empleado import Empleado
from app.models.usuario import Usuario
from app.models.camion import Camion
from app.models.ubicacion_inventario import UbicacionInventario
from app.models.lote import Lote
from app.models.inventario_lote import InventarioLote
from app.models.compra import Compra
from app.models.detalle_compra import DetalleCompra
from app.models.venta import Venta
from app.models.detalle_venta import DetalleVenta
from app.models.ruta import Ruta
from app.models.ruta_detalle import RutaDetalle
from app.models.cuadre_ruta import CuadreRuta
from app.models.movimiento_inventario import MovimientoInventario

__all__ = [
    "Marca",
    "Proveedor",
    "Producto",
    "Cliente",
    "Empleado",
    "Usuario",
    "Camion",
    "UbicacionInventario",
    "Lote",
    "InventarioLote",
    "Compra",
    "DetalleCompra",
    "Venta",
    "DetalleVenta",
    "Ruta",
    "RutaDetalle",
    "CuadreRuta",
    "MovimientoInventario",
]
