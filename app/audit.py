"""Bitácora de auditoría.

Registra en la tabla `bitacora` las operaciones sensibles del sistema
(inicios de sesión, altas/bajas/ediciones de datos, cierres de ruta, etc.).

Usa su propia sesión de base de datos para no interferir con la transacción
de la operación principal. Llamar SIEMPRE después de que la operación
principal haya hecho commit.
"""

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
    """Inserta una entrada en la bitácora. Nunca lanza excepción."""
    if usuario_id is None:
        return  # bitacora.usuario_id es NOT NULL

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
