"""
Dependencias de autenticación reutilizables.

- `require_login`      -> para vistas web: redirige a /login si no hay sesión.
- `require_login_api`  -> para endpoints JSON: responde 401 si no hay sesión.
- `get_db`             -> sesión de SQLAlchemy por request.
"""

from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from starlette.status import HTTP_302_FOUND, HTTP_401_UNAUTHORIZED

from app.database import SessionLocal


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RedirectException(Exception):
    """Señala que una vista web debe redirigir en lugar de renderizar."""

    def __init__(self, url: str, status_code: int = HTTP_302_FOUND):
        self.url = url
        self.status_code = status_code


def require_login(request: Request) -> int:
    """Devuelve el user_id de la sesión o corta con una redirección a /login."""
    user_id = request.session.get("user_id")
    if not user_id:
        raise RedirectException("/login")
    return int(user_id)


def require_login_api(request: Request) -> int:
    """Devuelve el user_id de la sesión o corta con 401."""
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="No autenticado")
    return int(user_id)


def registrar_manejador_redirect(app) -> None:
    """Convierte RedirectException en una RedirectResponse real."""

    @app.exception_handler(RedirectException)
    async def _handler(request: Request, exc: RedirectException):  # noqa: ANN001
        return RedirectResponse(url=exc.url, status_code=exc.status_code)
