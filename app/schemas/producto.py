from pydantic import BaseModel


class ProductoBase(BaseModel):
    codigo_barra: str
    nombre: str
    marca_id: int
    proveedor_id: int
    unidades_por_fardo: int
    precio_venta: float
    precio_compra: float
    es_retornable: bool
    requiere_vencimiento: bool
    stock_minimo: int
    activo: bool


class ProductoOut(ProductoBase):
    id: int

    class Config:
        from_attributes = True
