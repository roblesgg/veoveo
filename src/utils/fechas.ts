const DIA = 24 * 60 * 60 * 1000;

/** "hoy", "ayer" o "12 oct 2025". */
export function formatearFechaVista(fecha: number): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = new Date(fecha);
  dia.setHours(0, 0, 0, 0);
  const diferencia = Math.round((hoy.getTime() - dia.getTime()) / DIA);
  if (diferencia === 0) return 'hoy';
  if (diferencia === 1) return 'ayer';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
