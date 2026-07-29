from pydantic import BaseModel

class StockBodegaOut(BaseModel):
    producto_id: int
    producto: str
    stock: int
