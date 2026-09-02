import time
import threading

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import audit
from app.auth import get_db, require_login_api
from app.permissions import modulos_de, SOLO_LECTURA_POR_ROL

router = APIRouter(prefix="/api/auth", tags=["Auth"])


# --------------------------------------------------------------------
# Límite de intentos de inicio de sesión (protección contra fuerza bruta)
# --------------------------------------------------------------------
_MAX_INTENTOS = 5
_VENTANA_SEG = 300  # 5 minutos
_intentos: dict[str, list[float]] = {}
_lock = threading.Lock()


def _clave(username: str) -> str:
    return username.strip().lower()


def _bloqueado(username: str) -> int:
    """Devuelve segundos restantes de bloqueo, o 0 si no está bloqueado."""
    k = _clave(username)
    ahora = time.time()
    with _lock:
        recientes = [t for t in _intentos.get(k, []) if ahora - t < _VENTANA_SEG]
        _intentos[k] = recientes
        if len(recientes) >= _MAX_INTENTOS:
            return int(_VENTANA_SEG - (ahora - recientes[0])) + 1
    return 0


def _registrar_fallo(username: str) -> None:
    k = _clave(username)
    with _lock:
        _intentos.setdefault(k, []).append(time.time())


def _limpiar_intentos(username: str) -> None:
    with _lock:
        _intentos.pop(_clave(username), None)


# --------------------------------------------------------------------
class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=200)


def _usuario(db: Session, uid: int):
    return db.execute(
        text(
            """
            SELECT u.id,
                   u.username,
                   u.email::text                         AS email,
                   e.nombre                               AS nombre,
                   COALESCE((
                       SELECT r.nombre
                       FROM usuario_rol ur
                       JOIN rol r ON r.id = ur.rol_id
                       WHERE ur.usuario_id = u.id
                       ORDER BY r.id
                       LIMIT 1
                   ), 'Usuario')                          AS rol
            FROM usuario u
            JOIN empleado e ON e.id = u.empleado_id
            WHERE u.id = :id AND u.activo = true
            """
        ),
        {"id": uid},
    ).mappings().first()


def _perfil(row) -> dict:
    partes = (row["nombre"] or row["username"]).split()
    iniciales = "".join(p[0] for p in partes[:2]).upper() or "?"
    rol = row["rol"]
    return {
        "id": row["id"],
        "nombre": row["nombre"],
        "username": row["username"],
        "email": row["email"],
        "rol": rol,
        "handle": "@" + row["username"].split("@")[0],
        "iniciales": iniciales,
        "modulos": sorted(modulos_de(rol)),
        "solo_lectura": sorted(SOLO_LECTURA_POR_ROL.get(rol, set())),
    }


@router.post("/login")
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    espera = _bloqueado(data.username)
    if espera:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos fallidos. Espera {espera // 60 + 1} minuto(s).",
        )

    row = db.execute(
        text(
            """
            SELECT id FROM usuario
            WHERE username = :u
              AND activo = true
              AND password_hash = crypt(:p, password_hash)
            LIMIT 1
            """
        ),
        {"u": data.username.strip(), "p": data.password},
    ).first()

    if not row:
        _registrar_fallo(data.username)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    uid = int(row[0])
    _limpiar_intentos(data.username)
    request.session.clear()
    request.session["user_id"] = uid

    perfil = _perfil(_usuario(db, uid))
    audit.registrar(
        uid, "LOGIN", "usuario", uid,
        detalle=f"Inicio de sesión ({request.client.host if request.client else '-'})",
    )
    return {"usuario": perfil}


@router.post("/logout")
def logout(request: Request):
    uid = request.session.get("user_id")
    request.session.clear()
    if uid:
        audit.registrar(int(uid), "LOGOUT", "usuario", int(uid), detalle="Cierre de sesión")
    return {"ok": True}


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    uid = require_login_api(request)
    row = _usuario(db, uid)
    if not row:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Sesión inválida")
    return {"usuario": _perfil(row)}
