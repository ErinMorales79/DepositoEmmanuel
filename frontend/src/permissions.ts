/** A qué módulo pertenece cada ruta del SPA. Debe reflejar app/permissions.py. */
export function moduloDeRuta(pathname: string): string {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/productos")) return "productos";
  if (pathname.startsWith("/stock")) return "stock";
  if (pathname.startsWith("/compras")) return "compras";
  if (pathname.startsWith("/ventas")) return "ventas";
  if (pathname.startsWith("/clientes")) return "clientes";
  if (pathname.startsWith("/distribucion")) return "distribucion";
  if (pathname.startsWith("/contabilidad")) return "contabilidad";
  if (pathname.startsWith("/reportes")) return "reportes";
  if (pathname.startsWith("/configuracion")) return "configuracion";
  return "dashboard";
}

export function puedeVer(modulos: string[], pathname: string): boolean {
  return modulos.includes(moduloDeRuta(pathname));
}

export function soloLectura(solo_lectura: string[], pathname: string): boolean {
  return solo_lectura.includes(moduloDeRuta(pathname));
}
