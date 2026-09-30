// saludo segun la hora (buenos dias, buenas tardes, buenas noches)
export function saludo(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

// fecha en texto, ej: "viernes, 28 de agosto"
export const fechaLarga = (d = new Date()): string =>
  d.toLocaleDateString("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

// fecha de hoy y de hace N dias, para los filtros de fecha de los reportes
export const isoHoy = (): string => new Date().toISOString().slice(0, 10);
export const isoHace = (dias: number): string =>
  new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);

// primer dia del mes actual, para el filtro "este mes" de Contabilidad
export const isoInicioMes = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
