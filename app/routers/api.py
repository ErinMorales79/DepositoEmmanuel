from datetime import datetime

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, asc, text

from app.database import SessionLocal
from app.models.inventario_lote import InventarioLote
from app.models.lote import Lote
from app.models.venta import Venta
from app.models.detalle_venta import DetalleVenta
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.models.producto import Producto
from app.models.proveedor import Proveedor
from app.models.compra import Compra
from app.models.detalle_compra import DetalleCompra

router = APIRouter(prefix="/api")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_login_api(request: Request):
    if not request.session.get("user_id"):
        raise HTTPException(status_code=401, detail="No autenticado")


# ============================================================
# STOCK
# ============================================================
@router.get("/stock/{producto_id}")
def get_stock(producto_id: int, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    stock = (
        db.query(func.coalesce(func.sum(InventarioLote.cantidad), 0))
        .join(Lote, InventarioLote.lote_id == Lote.id)
        .filter(
            Lote.producto_id == producto_id,
            InventarioLote.ubicacion_id == 1
        )
        .scalar()
    )

    return {"stock": int(stock or 0)}


# ============================================================
# CREAR VENTA
# ============================================================
@router.post("/venta")
def crear_venta(data: dict, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    try:
        if "items" not in data or not data["items"]:
            return {"error": "No se recibieron productos para la venta"}

        cliente_id = data.get("cliente_id")
        if not cliente_id:
            return {"error": "Debe seleccionar un cliente"}

        cliente = db.query(Cliente).filter(Cliente.id == int(cliente_id)).first()
        if not cliente:
            return {"error": "El cliente seleccionado no existe"}

        usuario_id = request.session.get("user_id")
        usuario = db.query(Usuario).filter(Usuario.id == int(usuario_id)).first()
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
                    InventarioLote.ubicacion_id == 1
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
            canal="MOSTRADOR"
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

            lotes = (
                db.query(Lote)
                .join(InventarioLote, InventarioLote.lote_id == Lote.id)
                .filter(
                    Lote.producto_id == producto_id,
                    InventarioLote.ubicacion_id == 1,
                    InventarioLote.cantidad > 0
                )
                .order_by(asc(Lote.id))
                .all()
            )

            if not lotes:
                raise Exception(f"No hay lotes disponibles para el producto {producto_id}")

            for lote in lotes:
                if cantidad_por_consumir <= 0:
                    break

                inventario = (
                    db.query(InventarioLote)
                    .filter(
                        InventarioLote.lote_id == lote.id,
                        InventarioLote.ubicacion_id == 1
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

                detalle = DetalleVenta(
                    venta_id=venta.id,
                    producto_id=producto_id,
                    cantidad=consumido,
                    precio_unitario=precio_unitario,
                    subtotal_linea=precio_unitario * consumido
                )
                db.add(detalle)

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
@router.post("/productos")
def crear_producto(data: dict, request: Request, db: Session = Depends(get_db)):
    require_login_api(request)

    try:
        nombre = str(data.get("nombre", "")).strip()
        precio_compra = float(data.get("precio_compra", 0))
        precio_venta = float(data.get("precio_venta", 0))

        if not nombre:
            return {"error": "El nombre del producto es obligatorio"}

        if precio_compra < 0 or precio_venta < 0:
            return {"error": "Los precios no pueden ser negativos"}

        existente = db.query(Producto).filter(func.lower(Producto.nombre) == nombre.lower()).first()
        if existente:
            return {"error": "Ya existe un producto con ese nombre"}

        producto = Producto(
            nombre=nombre,
            precio_compra=precio_compra,
            precio_venta=precio_venta,
            activo=True
        )

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

        nombre = str(data.get("nombre", "")).strip()
        precio_compra = float(data.get("precio_compra", 0))
        precio_venta = float(data.get("precio_venta", 0))

        if not nombre:
            return {"error": "El nombre del producto es obligatorio"}

        if precio_compra < 0 or precio_venta < 0:
            return {"error": "Los precios no pueden ser negativos"}

        duplicado = (
            db.query(Producto)
            .filter(func.lower(Producto.nombre) == nombre.lower(), Producto.id != producto_id)
            .first()
        )

        if duplicado:
            return {"error": "Ya existe otro producto con ese nombre"}

        producto.nombre = nombre
        producto.precio_compra = precio_compra
        producto.precio_venta = precio_venta

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
    require_login_api(request)

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

        usuario_id = request.session.get("user_id")
        usuario = db.query(Usuario).filter(Usuario.id == int(usuario_id)).first()
        if not usuario:
            return {"error": "No existe un usuario válido en sesión para asociar la compra"}

        total = 0

        compra = Compra(
            proveedor_id=proveedor.id,
            usuario_id=usuario.id,
            fecha_hora=datetime.utcnow(),
            numero_factura=numero_factura,
            total=0
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

            detalle = DetalleCompra(
                compra_id=compra.id,
                producto_id=producto_id,
                cantidad=cantidad,
                precio_unitario=precio_unitario,
                fecha_vencimiento=datetime.strptime(fecha_vencimiento, "%Y-%m-%d").date()
            )

            db.add(detalle)
            total += cantidad * precio_unitario

        compra.total = total
        db.flush()

        # Ejecutar lógica ya existente en BD
        db.execute(
            text("SELECT finalizar_compra(:compra_id, :usuario_id)"),
            {"compra_id": compra.id, "usuario_id": usuario.id}
        )

        db.commit()

        return {"ok": True, "compra_id": compra.id}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}