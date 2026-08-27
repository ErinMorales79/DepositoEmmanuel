from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text

from app.config import SECRET_KEY
from app.database import engine
from app import models  # noqa: F401  (registra todos los modelos/tablas)
from app.auth import registrar_manejador_redirect
from app.routers import productos, stock, web, api, distribucion_web, distribucion_api
from app.routers.auth_web import router as auth_web_router


app = FastAPI(title="Deposito Emmanuel API")


app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

registrar_manejador_redirect(app)


templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")


app.include_router(auth_web_router)
app.include_router(productos.router)
app.include_router(stock.router)
app.include_router(web.router)
app.include_router(api.router)
app.include_router(distribucion_web.router)
app.include_router(distribucion_api.router)


@app.get("/")
def root(request: Request):
    if request.session.get("user_id"):
        return RedirectResponse(url="/dashboard", status_code=302)
    return RedirectResponse(url="/login", status_code=302)


@app.get("/test-db")
def test_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"db": "Conexión exitosa"}
    except Exception as e:
        return {"error": str(e)}
