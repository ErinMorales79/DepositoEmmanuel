# aqui se define que modulo puede ver y editar cada rol
# el backend lo usa para dar o quitar permisos, y el frontend usa
# la misma lista para armar el menu segun el rol que inicio sesion
#
# roles que existen: Admin, Cajero, Repartidor, Piloto, Contador

# lista de modulos del sistema
MODULOS = [
    "dashboard",
    "productos",
    "stock",
    "compras",
    "ventas",
    "clientes",
    "distribucion",
    "contabilidad",
    "reportes",
    "configuracion",
    "usuarios",
]

# que modulos puede ver cada rol
MODULOS_POR_ROL: dict[str, set[str]] = {
    "Admin": set(MODULOS),
    "Cajero": {"dashboard", "productos", "stock", "ventas", "clientes"},
    "Repartidor": {"dashboard", "stock", "clientes", "distribucion"},
    "Piloto": {"dashboard", "stock", "clientes", "distribucion"},
    "Contador": {"dashboard", "contabilidad", "reportes", "clientes"},
}

# de los modulos que puede ver, en cuales solo puede mirar (sin crear/editar)
# el Contador (Jessica) solo mira, quien crea y edita es el Admin
SOLO_LECTURA_POR_ROL: dict[str, set[str]] = {
    "Cajero": {"productos", "stock"},
    "Repartidor": {"stock", "clientes"},
    "Piloto": {"stock", "clientes"},
    "Contador": {"contabilidad", "reportes", "clientes"},
}

# si llega un rol que no esta en la lista, solo ve el dashboard
_ROL_DEFECTO = {"dashboard"}


def modulos_de(rol: str) -> set[str]:
    # devuelve los modulos que puede ver ese rol
    return set(MODULOS_POR_ROL.get(rol, _ROL_DEFECTO))


def puede_ver(rol: str, modulo: str) -> bool:
    return modulo in modulos_de(rol)


def puede_escribir(rol: str, modulo: str) -> bool:
    # true si el rol puede crear/editar/eliminar en ese modulo
    if not puede_ver(rol, modulo):
        return False
    return modulo not in SOLO_LECTURA_POR_ROL.get(rol, set())
