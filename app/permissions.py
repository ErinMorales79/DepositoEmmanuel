"""
Roles y permisos del sistema.

Fuente única de la verdad sobre qué módulos ve y qué puede modificar cada rol.
El backend la usa para autorizar cada operación; el frontend recibe la lista
de módulos permitidos en `/api/auth/me` y filtra el menú y las rutas con eso.

Roles reales en la base: Admin, Cajero, Repartidor, Piloto.
"""

# Módulos del sistema (las mismas claves que usa el frontend en las rutas).
MODULOS = [
    "dashboard",
    "productos",
    "stock",
    "compras",
    "ventas",
    "clientes",
    "distribucion",
    "reportes",
    "configuracion",
    "usuarios",
]

# Qué módulos ve cada rol.
MODULOS_POR_ROL: dict[str, set[str]] = {
    "Admin": set(MODULOS),
    "Cajero": {"dashboard", "productos", "stock", "ventas", "clientes"},
    "Repartidor": {"dashboard", "stock", "clientes", "distribucion"},
    "Piloto": {"dashboard", "stock", "clientes", "distribucion"},
}

# Dentro de un módulo visible, ¿en cuáles el rol solo puede consultar (no crear/editar)?
SOLO_LECTURA_POR_ROL: dict[str, set[str]] = {
    "Cajero": {"productos", "stock"},
    "Repartidor": {"stock", "clientes"},
    "Piloto": {"stock", "clientes"},
}

# Rol por defecto si la base trae un nombre no contemplado.
_ROL_DEFECTO = {"dashboard"}


def modulos_de(rol: str) -> set[str]:
    """Módulos visibles para un rol."""
    return set(MODULOS_POR_ROL.get(rol, _ROL_DEFECTO))


def puede_ver(rol: str, modulo: str) -> bool:
    return modulo in modulos_de(rol)


def puede_escribir(rol: str, modulo: str) -> bool:
    """True si el rol puede crear/editar/eliminar dentro del módulo."""
    if not puede_ver(rol, modulo):
        return False
    return modulo not in SOLO_LECTURA_POR_ROL.get(rol, set())
