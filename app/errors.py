"""Manejo uniforme de errores inesperados en los endpoints.

En desarrollo (DEBUG) devuelve el detalle del error para poder depurar.
En producción devuelve un mensaje genérico y registra el detalle en el log
del servidor, para no exponer información interna al cliente.
"""

import logging

from app.config import DEBUG

log = logging.getLogger("erp")


def error_generico(e: Exception, contexto: str = "") -> dict:
    log.exception("Fallo en %s", contexto or "una operación")
    return {
        "error": str(e)
        if DEBUG
        else "No se pudo completar la operación. Inténtalo de nuevo."
    }
