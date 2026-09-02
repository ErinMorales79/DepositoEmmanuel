"""
Dependencias de autenticación y autorización reutilizables.

- `require_login`      -> para vistas web: redirige a /login si no hay sesión.
- `require_login_api`  -> para endpoints JSON: responde 401 si no hay sesión.
- `verificar_permiso`  -> 401 si no hay sesión, 403 si el rol no puede usar el módulo.
- `get_db`             -> sesión de SQLAlchemy por request.
"""

from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.status import (
    HTTP_302_FOUND,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
)

from app.database import SessionLocal
from app.permissions import modulos_de, puede_escribir


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


def rol_de_usuario(db: Session, usuario_id: int) -> str:
    """Nombre del rol de un usuario activo (o cadena vacía si no existe)."""
    row = db.execute(
        text(
            """
            SELECT COALESCE((
                SELECT r.nombre FROM usuario_rol ur
                JOIN rol r ON r.id = ur.rol_id
                WHERE ur.usuario_id = :id
                ORDER BY r.id LIMIT 1
            ), '') AS rol
            FROM usuario u
            WHERE u.id = :id AND u.activo = true
            """
        ),
        {"id": usuario_id},
    ).first()
    return row[0] if row else ""


def verificar_permiso(
    request: Request,
    db: Session,
    modulo: str,
    escritura: bool = False,
) -> int:
    """Valida sesión + permiso del rol sobre un módulo. Devuelve el user_id.

    - 401 si no hay sesión.
    - 403 si el rol no ve el módulo, o si `escritura=True` y el rol es de solo consulta.
    """
    uid = require_login_api(request)
    rol = rol_de_usuario(db, uid)

    if not rol:
        request.session.clear()
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Sesión inválida")

    if modulo not in modulos_de(rol):
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail=f"Tu rol ({rol}) no tiene acceso al módulo de {modulo}.",
        )

    if escritura and not puede_escribir(rol, modulo):
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail=f"Tu rol ({rol}) solo puede consultar {modulo}, no modificarlo.",
        )

    return uid


def registrar_manejador_redirect(app) -> None:
    """Convierte RedirectException en una RedirectResponse real."""

    @app.exception_handler(RedirectException)
    async def _handler(request: Request, exc: RedirectException):  # noqa: ANN001
        return RedirectResponse(url=exc.url, status_code=exc.status_code)
