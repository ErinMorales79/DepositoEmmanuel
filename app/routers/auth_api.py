from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import get_db, require_login_api

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginIn(BaseModel):
    username: str
    password: str


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
    return {
        "id": row["id"],
        "nombre": row["nombre"],
        "username": row["username"],
        "email": row["email"],
        "rol": row["rol"],
        "handle": "@" + row["username"].split("@")[0],
        "iniciales": iniciales,
    }


@router.post("/login")
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
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
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    request.session["user_id"] = int(row[0])
    return {"usuario": _perfil(_usuario(db, int(row[0])))}


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    uid = require_login_api(request)
    row = _usuario(db, uid)
    if not row:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Sesión inválida")
    return {"usuario": _perfil(row)}
