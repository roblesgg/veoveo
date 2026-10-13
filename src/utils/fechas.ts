const DIA = 24 * 60 * 60 * 1000;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** Días naturales entre una fecha y hoy (0 = hoy, 1 = ayer…). */
function diasDesde(fecha: number): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = new Date(fecha);
  dia.setHours(0, 0, 0, 0);
  return Math.round((hoy.getTime() - dia.getTime()) / DIA);
}

const dosCifras = (n: number) => String(n).padStart(2, '0');
const hora = (d: Date) => `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`;
const fechaCorta = (d: Date, conAno: boolean) =>
  `${d.getDate()} ${MESES[d.getMonth()]}${conAno ? ` ${d.getFullYear()}` : ''}`;

/** "hoy", "ayer" o "12 oct 2025". */
export function formatearFechaVista(fecha: number): string {
  const d = diasDesde(fecha);
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  return fechaCorta(new Date(fecha), true);
}

/** Hora de un mensaje: "21:34". */
export function formatearHora(fecha: number): string {
  return hora(new Date(fecha));
}

/** Para la lista de chats: "21:34", "Ayer", "lunes", "12 oct" o "12 oct 2025". */
export function formatearMomentoChat(fecha: number): string {
  const d = diasDesde(fecha);
  const f = new Date(fecha);
  if (d === 0) return hora(f);
  if (d === 1) return 'Ayer';
  if (d < 7) return DIAS[f.getDay()];
  return fechaCorta(f, f.getFullYear() !== new Date().getFullYear());
}

/** Separador por día en una conversación: "Hoy", "Ayer", "Lunes" o "12 oct 2025". */
export function formatearSeparadorDia(fecha: number): string {
  const d = diasDesde(fecha);
  const f = new Date(fecha);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  if (d < 7) return DIAS[f.getDay()].charAt(0).toUpperCase() + DIAS[f.getDay()].slice(1);
  return fechaCorta(f, f.getFullYear() !== new Date().getFullYear());
}

/** ¿Dos momentos caen en días distintos? */
export function esOtroDia(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() !== y.getFullYear() || x.getMonth() !== y.getMonth() || x.getDate() !== y.getDate();
}
