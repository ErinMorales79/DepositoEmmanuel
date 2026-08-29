import re
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.auth import get_db, require_login_api
from app.models.inventario_lote import InventarioLote
from app.models.lote import Lote
from app.models.venta import Venta
from app.models.detalle_venta import DetalleVenta
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.models.producto import Producto
from app.models.marca import Marca
from app.models.proveedor import Proveedor
from app.models.compra import Compra
from app.models.detalle_compra import DetalleCompra
from app.models.movimiento_inventario import MovimientoInventario

router = APIRouter(prefix="/api")

UBICACION_BODEGA = 1
CODIGO_BARRA_RE = re.compile(r"^[0-9]{8,14}$")


def _fifo_lotes(db: Session, producto_id: int, ubicacion_id: int):
    """Lotes con existencia en una ubicación, ordenados FIFO por vencimiento."""
    return (
        db.query(Lote)
        .join(InventarioLote, InventarioLote.lote_id == Lote.id)
        .filter(
            Lote.producto_id == producto_id,
            InventarioLote.ubicacion_id == ubicacion_id,
            InventarioLote.cantidad > 0,
        )
        .order_by(Lote.fecha_vencimiento.asc().nulls_last(), Lote.id.asc())
        .all()
    )


# ============================================================
# CREAR VENTA
# ============================================================
@router.post("/venta")
def crear_venta(data: dict, request: Request, db: Session = Depends(get_db)):
    usuario_id = require_login_api(request)

    try:
        if "items" not in data or not data["items"]:
            return {"error": "No se recibieron productos para la venta"}

        cliente_id = data.get("cliente_id")
        if not cliente_id:
            return {"error": "Debe seleccionar un cliente"}

        cliente = db.query(Cliente).filter(Cliente.id == int(cliente_id)).first()
        if not cliente:
            return {"error": "El cliente seleccionado no existe"}

        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            return {"error": "No existe un usuario válido en sesión para asociar la venta"}

        productos_agrupados = {}

        for item in data["items"]:
            if "producto_id" not in item or "cantidad" not in item:
                return {"error": "Hay un item incompleto en la venta"}

            pid = int(item["producto_id"])
            cantidad = int(item["cantidad"])

            if cantidad <= 0:
                return {"error": f"La cantidad del producto {pid} debe ser mayor a cero"}

            productos_agrupados[pid] = productos_agrupados.get(pid, 0) + cantidad

        for producto_id, cantidad_total in productos_agrupados.items():
            stock = (
                db.query(func.coalesce(func.sum(InventarioLote.cantidad), 0))
                .join(Lote, InventarioLote.lote_id == Lote.id)
                .filter(
                    Lote.producto_id == producto_id,
                    InventarioLote.ubicacion_id == UBICACION_BODEGA,
                )
                .scalar()
            )

            stock = int(stock or 0)

            if cantidad_total > stock:
                return {
                    "error": (
                        f"Stock insuficiente para producto {producto_id}. "
                        f"Disponible: {stock}, requerido: {cantidad_total}"
                    )
                }

        venta = Venta(
            cliente_id=cliente.id,
            usuario_id=usuario.id,
            estado="FINALIZADA",
            canal="MOSTRADOR",
        )

        db.add(venta)
        db.flush()

        total = 0

        for item in data["items"]:
            producto_id = int(item["producto_id"])
            cantidad_por_consumir = int(item["cantidad"])

            producto = db.query(Producto).filter(Producto.id == producto_id).first()
            if not producto:
                raise Exception(f"El producto {producto_id} no existe")

            precio_unitario = float(producto.precio_venta)

            lotes = _fifo_lotes(db, producto_id, UBICACION_BODEGA)

            if not lotes:
                raise Exception(f"No hay lotes disponibles para el producto {producto_id}")

            for lote in lotes:
                if cantidad_por_consumir <= 0:
                    break

                inventario = (
                    db.query(InventarioLote)
                    .filter(
                        InventarioLote.lote_id == lote.id,
                        InventarioLote.ubicacion_id == UBICACION_BODEGA,
                    )
                    .first()
                )

                if not inventario:
                    continue

                if inventario.cantidad >= cantidad_por_consumir:
                    consumido = cantidad_por_consumir
                    inventario.cantidad -= cantidad_por_consumir
                    cantidad_por_consumir = 0
                else:
                    consumido = inventario.cantidad
                    cantidad_por_consumir -= inventario.cantidad
                    inventario.cantidad = 0

                if consumido <= 0:
                    continue

                db.add(
                    DetalleVenta(
                        venta_id=venta.id,
                        producto_id=producto_id,
                        cantidad=consumido,
                        precio_unitario=precio_unitario,
                        subtotal_linea=precio_unitario * consumido,
                    )
                )

                db.add(
                    MovimientoInventario(
                        tipo="SALIDA",
                        usuario_id=usuario.id,
                        producto_id=producto_id,
                        lote_id=lote.id,
                        ubicacion_origen_id=UBICACION_BODEGA,
                        ubicacion_destino_id=None,
                        cantidad=consumido,
                        referencia_tipo="VENTA",
                        referencia_id=venta.id,
                        motivo="Salida por venta de mostrador",
                    )
                )

                total += precio_unitario * consumido

            if cantidad_por_consumir > 0:
                raise Exception(f"No se pudo completar el consumo FIFO del producto {producto_id}")

        venta.total = total
        venta.subtotal = total

        db.commit()

        return {"ok": True, "venta_id": venta.id}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


# ============================================================
# PRODUCTOS
# ============================================================
def _leer_datos_producto(data: dict, db: Session, producto_id: int | None = None):
    """Valida y normaliza el payload de producto. Devuelve (valores, error)."""
    nombre = str(data.get("nombre", "")).strip()
    codigo_barra = str(data.get("codigo_barra", "")).strip()

    if not nombre:
        return None, "El nombre del producto es obligatorio"

    if not CODIGO_BARRA_RE.match(codigo_barra):
        return None, "El código de barra debe tener entre 8 y 14 dígitos numéricos"

    try:
        marca_id = int(data.get("marca_id") or 0)
        proveedor_id = int(data.get("proveedor_id") or 0)
        unidades_por_fardo = int(data.get("unidades_por_fardo") or 0)
        precio_compra = float(data.get("precio_compra", 0))
        precio_venta = float(data.get("precio_venta", 0))
        stock_minimo = int(data.get("stock_minimo") or 0)
    except (TypeError, ValueError):
        return None, "Hay valores numéricos inválidos en el formulario"

    if precio_compra < 0 or precio_venta < 0:
        return None, "Los precios no pueden ser negativos"

    if unidades_por_fardo <= 0:
        return None, "Las unidades por fardo deben ser mayores a cero"

    if stock_minimo < 0:
        return None, "El stock mínimo no puede ser negativo"

    if not db.query(Marca).filter(Marca.id == marca_id).first():
        return None, "La marca seleccionada no existe"

    if not db.query(Proveedor).filter(Proveedor.id == proveedor_id).first():
        return None, "El proveedor seleccionado no existe"

    dup_codigo = (
        db.query(Producto)
        .filter(Producto.codigo_barra == codigo_barra, Producto.id != (producto_id or 0))
        .first()
    )
    if dup_codigo:
        return None, "Ya existe un producto con ese código de barra"

    dup_nombre = (
        db.query(Producto)
        .filter(func.lower(Producto.nombre) == nombre.lower(), Producto.id != (producto_id or 0))
        .first()
    )
    if dup_nombre:
        return None, "Ya existe un producto con ese nombre"

    return {
        "nombre": nombre,
        "codigo_barra": codigo_barra,
        "marca_id": marca_id,
        "proveedor_id": proveedor_id,
        "unidades_por_fardo": unidades_por_fardo,
        "precio_compra": precio_compra,
        "precio_venta": precio_venta,
        "es_retornable": bool(data.get("es_retornable", False)),
        "requiere_vencimiento": bool(data.get("requiere_vencimiento", True)),
        "stock_minimo": stock_minimo,
    }, None


@router.post("/productos")
def crear_producto(data: dict, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    try:
        valores, error = _leer_datos_producto(data, db)
        if error:
            return {"error": error}

        producto = Producto(activo=True, **valores)
        db.add(producto)
        db.commit()
        db.refresh(producto)

        return {"ok": True, "producto_id": producto.id}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


@router.put("/productos/{producto_id}")
def editar_producto(producto_id: int, data: dict, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    try:
        producto = db.query(Producto).filter(Producto.id == producto_id).first()
        if not producto:
            return {"error": "Producto no encontrado"}

        valores, error = _leer_datos_producto(data, db, producto_id=producto_id)
        if error:
            return {"error": error}

        for campo, valor in valores.items():
            setattr(producto, campo, valor)

        db.commit()

        return {"ok": True}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


@router.patch("/productos/{producto_id}/estado")
def cambiar_estado_producto(producto_id: int, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    try:
        producto = db.query(Producto).filter(Producto.id == producto_id).first()
        if not producto:
            return {"error": "Producto no encontrado"}

        producto.activo = not bool(producto.activo)
        db.commit()

        return {"ok": True, "activo": bool(producto.activo)}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


# ============================================================
# COMPRAS
# ============================================================
@router.post("/compra")
def crear_compra(data: dict, request: Request, db: Session = Depends(get_db)):
    usuario_id = require_login_api(request)

    try:
        if "items" not in data or not data["items"]:
            return {"error": "No se recibieron productos para la compra"}

        proveedor_id = data.get("proveedor_id")
        numero_factura = str(data.get("numero_factura", "")).strip()

        if not proveedor_id:
            return {"error": "Debe seleccionar un proveedor"}

        if not numero_factura:
            return {"error": "Debe ingresar número de factura"}

        proveedor = db.query(Proveedor).filter(Proveedor.id == int(proveedor_id)).first()
        if not proveedor:
            return {"error": "El proveedor seleccionado no existe"}

        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            return {"error": "No existe un usuario válido en sesión para asociar la compra"}

        total = 0

        compra = Compra(
            proveedor_id=proveedor.id,
            usuario_id=usuario.id,
            fecha_hora=datetime.now(),
            numero_factura=numero_factura,
            total=0,
        )

        db.add(compra)
        db.flush()

        for item in data["items"]:
            if (
                "producto_id" not in item
                or "cantidad" not in item
                or "precio_unitario" not in item
                or "fecha_vencimiento" not in item
            ):
                return {"error": "Hay un item incompleto en la compra"}

            producto_id = int(item["producto_id"])
            cantidad = int(item["cantidad"])
            precio_unitario = float(item["precio_unitario"])
            fecha_vencimiento = str(item["fecha_vencimiento"]).strip()

            if cantidad <= 0:
                return {"error": "La cantidad debe ser mayor a cero"}

            if precio_unitario < 0:
                return {"error": "El precio unitario no puede ser negativo"}

            producto = db.query(Producto).filter(Producto.id == producto_id).first()
            if not producto:
                return {"error": f"El producto {producto_id} no existe"}

            venc = None
            if fecha_vencimiento:
                venc = datetime.strptime(fecha_vencimiento, "%Y-%m-%d").date()

            if producto.requiere_vencimiento and venc is None:
                return {"error": f"El producto '{producto.nombre}' requiere fecha de vencimiento"}

            if not producto.requiere_vencimiento and venc is not None:
                venc = None

            db.add(
                DetalleCompra(
                    compra_id=compra.id,
                    producto_id=producto_id,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    fecha_vencimiento=venc,
                )
            )
            total += cantidad * precio_unitario

        compra.total = total
        db.flush()

        # Lógica de inventario ya implementada en la base de datos.
        db.execute(
            text("SELECT finalizar_compra(:compra_id, :usuario_id)"),
            {"compra_id": compra.id, "usuario_id": usuario.id},
        )

        db.commit()

        return {"ok": True, "compra_id": compra.id}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}
