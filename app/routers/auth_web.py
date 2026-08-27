from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.auth import get_db

router = APIRouter(tags=["AuthWeb"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/login")
def login_view(request: Request):


    if request.session.get("user_id"):
        return RedirectResponse(url="/dashboard", status_code=302)

    return templates.TemplateResponse(
        request,
        "login.html",
        {
            "request": request,
            "error": None
        }
    )


@router.post("/login")
def login_post(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    result = db.execute(
        text("""
            SELECT id, username, activo
            FROM usuario
            WHERE username = :username
              AND activo = true
              AND password_hash = crypt(:password, password_hash)
            LIMIT 1
        """),
        {
            "username": username,
            "password": password
        }
    ).mappings().first()

    if not result:
        return templates.TemplateResponse(
            request,
            "login.html",
            {
                "request": request,
                "error": "Usuario o contraseña incorrectos"
            }
        )

    request.session["user_id"] = int(result["id"])
    request.session["username"] = result["username"]

    return RedirectResponse(url="/dashboard", status_code=302)


@router.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=302)