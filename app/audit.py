# guarda en la tabla "bitacora" quien hizo que y cuando
# (login, crear, editar, eliminar, etc)
#
# usa su propia conexion a la base de datos para no afectar la operacion
# principal. siempre se llama DESPUES de que esa operacion ya hizo commit

import json

from sqlalchemy import text

from app.database import SessionLocal


def registrar(
    usuario_id: int | None,
    accion: str,
    entidad: str,
    registro_id: int | None = None,
    detalle: str | None = None,
    antes: dict | None = None,
    despues: dict | None = None,
) -> None:
    # guarda una fila en la bitacora. si algo falla, no truena el programa
    if usuario_id is None:
        return  # la tabla bitacora exige un usuario

    s = SessionLocal()
    try:
        s.execute(
            text(
                """
                INSERT INTO bitacora
                    (usuario_id, accion, entidad, registro_id, antes, despues, detalle)
                VALUES
                    (:u, :a, :e, :r, CAST(:ant AS jsonb), CAST(:des AS jsonb), :d)
                """
            ),
            {
                "u": usuario_id,
                "a": accion,
                "e": entidad,
                "r": registro_id,
                "ant": json.dumps(antes, ensure_ascii=False) if antes is not None else None,
                "des": json.dumps(despues, ensure_ascii=False) if despues is not None else None,
                "d": detalle,
            },
        )
        s.commit()
    except Exception:  # noqa: BLE001
        s.rollback()
    finally:
        s.close()
