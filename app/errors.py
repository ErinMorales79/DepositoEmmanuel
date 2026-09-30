# cuando algo falla en un endpoint, esto arma la respuesta de error
# en desarrollo muestra el error real, en produccion un mensaje generico
# (el error real siempre se guarda en el log del servidor)

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
