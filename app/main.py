from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text

from app.config import COOKIE_SECURE, DEBUG, SECRET_KEY, SESSION_MAX_AGE
from app.database import engine
from app import models  # noqa: F401  (esto registra todas las tablas)
from app.auth import registrar_manejador_redirect
from app.routers import (
    api,
    auth_api,
    clientes_api,
    contabilidad_api,
    data_api,
    distribucion_api,
    usuarios_api,
)

# esto era el frontend viejo (paginas con Jinja), ya no se usa, ahora es todo React
# si algun dia se necesita volver a usarlo, descomenta esto:
# from app.routers import productos, stock, web, distribucion_web
# from app.routers.auth_web import router as auth_web_router


app = FastAPI(
    title="Deposito Emmanuel API",
    docs_url="/docs" if DEBUG else None,       # la documentacion de la API solo se ve en desarrollo
    redoc_url=None,
    openapi_url="/openapi.json" if DEBUG else None,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    max_age=SESSION_MAX_AGE,
    same_site="lax",
    https_only=COOKIE_SECURE,
)
registrar_manejador_redirect(app)


@app.middleware("http")
async def cabeceras_seguridad(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "same-origin"
    resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    resp.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    return resp


app.mount("/static", StaticFiles(directory="app/static"), name="static")

# --- se conectan todas las rutas de la API ---
app.include_router(auth_api.router)          # login / logout
app.include_router(data_api.router)          # consultas (leer datos)
app.include_router(api.router)               # crear / editar datos
app.include_router(clientes_api.router)      # clientes
app.include_router(contabilidad_api.router)  # contabilidad
app.include_router(distribucion_api.router)  # rutas de reparto
app.include_router(usuarios_api.router)      # usuarios
# app.include_router(auth_web_router)
# app.include_router(productos.router)
# app.include_router(stock.router)
# app.include_router(web.router)
# app.include_router(distribucion_web.router)


@app.get("/test-db")
def test_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"db": "Conexión exitosa"}
    except Exception as e:  # noqa: BLE001
        # en produccion no se muestra el error real, solo en desarrollo
        return {"db": "error", "detalle": str(e) if DEBUG else "No se pudo conectar a la base de datos"}


# --- aqui se sirve el frontend de React ya compilado ---
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if (FRONTEND_DIST / "assets").is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIST / "assets")),
        name="assets",
    )


@app.get("/{full_path:path}")
def servir_spa(full_path: str):
    # manda el index.html para cualquier ruta que no sea de la API
    # (React Router se encarga de mostrar la pagina correcta en el navegador)
    if full_path.startswith("api/"):
        return JSONResponse(status_code=404, content={"error": "Endpoint no encontrado"})

    # si es un archivo real dentro de dist (como el favicon), lo manda tal cual
    if full_path:
        raiz = FRONTEND_DIST.resolve()
        candidato = (raiz / full_path).resolve()
        if candidato.is_file() and str(candidato).startswith(str(raiz)):
            return FileResponse(str(candidato))

    index = FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(str(index))

    return JSONResponse(
        status_code=503,
        content={
            "error": "El frontend aún no ha sido compilado.",
            "solucion": "cd frontend  &&  npm install  &&  npm run build",
            "docs_api": "/docs",
        },
    )
