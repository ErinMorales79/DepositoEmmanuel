from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import SessionLocal
from app.models.producto import Producto
from app.models.lote import Lote
from app.models.inventario_lote import InventarioLote
from app.models.venta import Venta
from app.models.cliente import Cliente
from app.models.proveedor import Proveedor
from app.models.compra import Compra
from fastapi.responses import RedirectResponse



router = APIRouter(tags=["Web"])
templates = Jinja2Templates(directory="app/templates")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/dashboard")
def dashboard(request: Request, db: Session = Depends(get_db)):

    

    if not request.session.get("user_id"):
        return RedirectResponse(url="/login", status_code=302)

    productos = db.query(Producto).filter(Producto.activo == True).all()

    stock_raw = (
        db.query(
            Producto.id.label("producto_id"),
            Producto.nombre.label("producto"),
            func.coalesce(func.sum(InventarioLote.cantidad), 0).label("stock")
        )
        .join(Lote, Lote.producto_id == Producto.id)
        .join(InventarioLote, InventarioLote.lote_id == Lote.id)
        .filter(InventarioLote.ubicacion_id == 1)
        .group_by(Producto.id, Producto.nombre)
        .all()
    )

    stock = [
        {
            "producto_id": s.producto_id,
            "producto": s.producto,
            "stock": int(s.stock)
        }
        for s in stock_raw
    ]

    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "productos": productos,
            "stock": stock
        }
    )


@router.get("/ventas")
def listar_ventas(request: Request, db: Session = Depends(get_db)):
    ventas_raw = (
        db.query(Venta, Cliente.nombre.label("cliente_nombre"))
        .join(Cliente, Cliente.id == Venta.cliente_id)
        .order_by(Venta.id.desc())
        .all()
    )

    ventas = [
        {
            "id": v.id,
            "fecha_hora": v.fecha_hora,
            "cliente": cliente_nombre,
            "total": float(v.total or 0),
            "estado": v.estado,
            "canal": v.canal
        }
        for v, cliente_nombre in ventas_raw
    ]

    return templates.TemplateResponse(
        request,
        "ventas.html",
        {
            "ventas": ventas
        }
    )


@router.get("/venta/nueva")
def nueva_venta(request: Request, db: Session = Depends(get_db)):
    productos = db.query(Producto).filter(Producto.activo == True).all()
    clientes = db.query(Cliente).order_by(Cliente.nombre.asc()).all()

    productos_json = [
        {
            "id": p.id,
            "nombre": p.nombre,
            "precio_venta": float(p.precio_venta or 0),
            "activo": bool(p.activo)
        }
        for p in productos
    ]

    clientes_json = [
        {
            "id": c.id,
            "nombre": c.nombre,
            "direccion": c.direccion or ""
        }
        for c in clientes
    ]

    return templates.TemplateResponse(
        request,
        "nueva_venta.html",
        {
            "productos_json": productos_json,
            "clientes_json": clientes_json
        }
    )


@router.get("/productos-admin")
def productos_admin(request: Request, db: Session = Depends(get_db)):
    productos = db.query(Producto).order_by(Producto.id.desc()).all()

    productos_json = [
        {
            "id": p.id,
            "nombre": p.nombre,
            "precio_compra": float(p.precio_compra or 0),
            "precio_venta": float(p.precio_venta or 0),
            "activo": bool(p.activo)
        }
        for p in productos
    ]

    return templates.TemplateResponse(
        request,
        "productos.html",
        {
            "productos_json": productos_json
        }
    )


@router.get("/stock-admin")
def stock_admin(request: Request, db: Session = Depends(get_db)):
    stock_resumen_raw = (
        db.query(
            Producto.id.label("producto_id"),
            Producto.nombre.label("producto"),
            func.coalesce(func.sum(InventarioLote.cantidad), 0).label("stock")
        )
        .join(Lote, Lote.producto_id == Producto.id)
        .join(InventarioLote, InventarioLote.lote_id == Lote.id)
        .filter(InventarioLote.ubicacion_id == 1)
        .group_by(Producto.id, Producto.nombre)
        .order_by(Producto.nombre.asc())
        .all()
    )

    stock_resumen_json = [
        {
            "producto_id": s.producto_id,
            "producto": s.producto,
            "stock": int(s.stock)
        }
        for s in stock_resumen_raw
    ]

    lotes_raw = (
        db.query(
            Lote.id.label("lote_id"),
            Producto.nombre.label("producto"),
            Lote.fecha_vencimiento.label("fecha_vencimiento"),
            InventarioLote.cantidad.label("cantidad")
        )
        .join(Producto, Producto.id == Lote.producto_id)
        .join(InventarioLote, InventarioLote.lote_id == Lote.id)
        .filter(InventarioLote.ubicacion_id == 1)
        .order_by(Producto.nombre.asc(), Lote.id.asc())
        .all()
    )

    lotes_json = [
        {
            "lote_id": l.lote_id,
            "producto": l.producto,
            "fecha_vencimiento": str(l.fecha_vencimiento) if l.fecha_vencimiento else "",
            "cantidad": int(l.cantidad)
        }
        for l in lotes_raw
    ]

    return templates.TemplateResponse(
        request,
        "stock.html",
        {
            "stock_resumen_json": stock_resumen_json,
            "lotes_json": lotes_json
        }
    )


@router.get("/compras-admin")
def compras_admin(request: Request, db: Session = Depends(get_db)):
    productos = db.query(Producto).filter(Producto.activo == True).order_by(Producto.nombre.asc()).all()
    proveedores = db.query(Proveedor).order_by(Proveedor.nombre.asc()).all()
    compras = db.query(Compra).order_by(Compra.id.desc()).limit(10).all()

    productos_json = [
        {
            "id": p.id,
            "nombre": p.nombre,
            "precio_compra": float(p.precio_compra or 0)
        }
        for p in productos
    ]

    proveedores_json = [
        {
            "id": pr.id,
            "nombre": pr.nombre
        }
        for pr in proveedores
    ]

    compras_json = [
        {
            "id": c.id,
            "fecha_hora": str(c.fecha_hora),
            "numero_factura": c.numero_factura,
            "total": float(c.total or 0),
            "proveedor_id": c.proveedor_id
        }
        for c in compras
    ]

    return templates.TemplateResponse(
        request,
        "compras.html",
        {
            "productos_json": productos_json,
            "proveedores_json": proveedores_json,
            "compras_json": compras_json
        }
    )