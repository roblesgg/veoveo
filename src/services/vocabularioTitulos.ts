/**
 * Vocabulario de títulos para que los buscadores perdonen faltas (busquedaLista.ts).
 * Se alimenta solo: cada vez que la app pinta títulos (carruseles, biblioteca, resultados),
 * se apuntan aquí. Vive en memoria; al arrancar se rellena enseguida con el primer carrusel.
 */

const TOPE = 4000;
const titulos = new Set<string>();

export function apuntarTitulos(nuevos: (string | undefined | null)[]): void {
  if (titulos.size >= TOPE) return;
  for (const t of nuevos) {
    if (t && t.length > 1) titulos.add(t);
    if (titulos.size >= TOPE) return;
  }
}

export function vocabularioTitulos(): Set<string> {
  return titulos;
}
