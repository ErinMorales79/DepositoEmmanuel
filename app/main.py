from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text

from app.config import SECRET_KEY
from app.database import engine
from app import models  # noqa: F401  (registra todos los modelos/tablas)
from app.auth import registrar_manejador_redirect
from app.routers import api, auth_api, data_api, distribucion_api

# Frontend heredado (plantillas Jinja) + login web. El SPA de React lo reemplaza.
# Para reactivar el frontend viejo, descomenta:
# from app.routers import productos, stock, web, distribucion_web
# from app.routers.auth_web import router as auth_web_router


app = FastAPI(title="Deposito Emmanuel API")

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
registrar_manejador_redirect(app)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

# --- API ---------------------------------------------------------------
app.include_router(auth_api.router)          # /api/auth/*
app.include_router(data_api.router)          # /api/* (lecturas)
app.include_router(api.router)               # /api/* (mutaciones)
app.include_router(distribucion_api.router)  # /api/distribucion/*
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
        return {"error": str(e)}


# --- Frontend SPA (React compilado) ------------------------------------
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if (FRONTEND_DIST / "assets").is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIST / "assets")),
        name="assets",
    )


@app.get("/{full_path:path}")
def servir_spa(full_path: str):
    """Sirve el index.html del SPA para cualquier ruta que no sea de la API.

    React Router resuelve la navegación en el navegador. En desarrollo se
    usa el servidor de Vite (`npm run dev`, puerto 5173); esta ruta es
    para producción, donde el backend sirve el build de `frontend/dist`.
    """
    if full_path.startswith("api/"):
        return JSONResponse(status_code=404, content={"error": "Endpoint no encontrado"})

    # Archivo estático real dentro de dist/ (favicon.svg, imágenes de /public, …)
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
