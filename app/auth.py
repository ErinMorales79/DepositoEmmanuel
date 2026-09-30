# funciones de login y permisos que se reusan en todo el backend
#
# - require_login     -> para paginas web: si no hay sesion, redirige a /login
# - require_login_api -> para la API: si no hay sesion, responde 401
# - verificar_permiso -> 401 si no hay sesion, 403 si el rol no puede usar ese modulo
# - get_db            -> abre una conexion a la base de datos por cada peticion

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
    # avisa que hay que redirigir a otra pagina en vez de mostrar la actual
    def __init__(self, url: str, status_code: int = HTTP_302_FOUND):
        self.url = url
        self.status_code = status_code


def require_login(request: Request) -> int:
    # si no hay sesion iniciada, manda a /login
    user_id = request.session.get("user_id")
    if not user_id:
        raise RedirectException("/login")
    return int(user_id)


def require_login_api(request: Request) -> int:
    # igual que arriba, pero para la API responde un error 401
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="No autenticado")
    return int(user_id)


def rol_de_usuario(db: Session, usuario_id: int) -> str:
    # busca el rol del usuario (Admin, Cajero, etc). si no existe, regresa vacio
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
    # revisa que haya sesion y que el rol pueda usar ese modulo
    # 401 = no hay sesion / 403 = el rol no tiene permiso
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
    # convierte el RedirectException en una redireccion de verdad

    @app.exception_handler(RedirectException)
    async def _handler(request: Request, exc: RedirectException):  # noqa: ANN001
        return RedirectResponse(url=exc.url, status_code=exc.status_code)
