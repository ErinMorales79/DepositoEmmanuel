"""
Configuración central del backend.

Los valores se leen de variables de entorno y, si existe, de un archivo `.env`
en la raíz del proyecto. Se mantienen valores por defecto para desarrollo local
para que el proyecto siga arrancando sin configuración previa.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _cargar_dotenv() -> None:
    """Carga pares CLAVE=VALOR de un archivo .env sin dependencias externas."""
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for linea in env_path.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        clave = clave.strip()
        valor = valor.strip().strip('"').strip("'")
        # No pisar variables ya definidas en el entorno real
        os.environ.setdefault(clave, valor)


_cargar_dotenv()


def _bool_env(nombre: str, por_defecto: bool = False) -> bool:
    return os.getenv(nombre, str(por_defecto)).strip().lower() in {"1", "true", "yes", "on"}


# --- Base de datos ---------------------------------------------------------
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "DepositoEmmanuel")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
)

SQL_ECHO = _bool_env("SQL_ECHO", False)

# --- Entorno -----------------------------------------------------------
# DEBUG=true en desarrollo local. En el negocio se deja en false.
DEBUG = _bool_env("DEBUG", True)

# --- Sesión / seguridad --------------------------------------------------
_SECRET_DEFAULT = "dev-only-change-me-Emmanuel100200"
SECRET_KEY = os.getenv("SECRET_KEY", _SECRET_DEFAULT)

# Duración de la sesión (segundos). Por defecto 8 horas (una jornada).
SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", str(8 * 60 * 60)))

# Marca la cookie de sesión como "Secure" (solo viaja por HTTPS).
# Actívalo cuando el sistema se sirva por HTTPS.
COOKIE_SECURE = _bool_env("COOKIE_SECURE", False)

if not DEBUG and SECRET_KEY == _SECRET_DEFAULT:
    import warnings

    warnings.warn(
        "SECRET_KEY tiene el valor por defecto en modo producción. "
        "Genera una clave nueva y ponla en el archivo .env (SECRET_KEY=...).",
        stacklevel=1,
    )
