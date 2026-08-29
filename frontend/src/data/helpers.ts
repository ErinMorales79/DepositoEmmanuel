/** Saludo según la hora local. */
export function saludo(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** "viernes, 28 de agosto" */
export const fechaLarga = (d = new Date()): string =>
  d.toLocaleDateString("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/** ISO (YYYY-MM-DD) de hoy y de hace N días — para los rangos de reportes. */
export const isoHoy = (): string => new Date().toISOString().slice(0, 10);
export const isoHace = (dias: number): string =>
  new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
