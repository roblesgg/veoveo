/**
 * Zoom entre un cartel y su ficha («como en el iPhone»): al tocar un cartel se guarda dónde
 * estaba en pantalla; la ficha lo usa para crecer desde ahí y, al volver, encogerse hasta ahí.
 * No es un elemento compartido de verdad (eso es experimental en nuestra versión y con la
 * arquitectura antigua): es una copia del cartel animada con transform, que da casi la misma
 * sensación sin riesgo.
 */
import type { View } from 'react-native';

export type Rect = { x: number; y: number; width: number; height: number };
export type OrigenZoom = { id: number; rect: Rect; poster: string | null };

let origen: OrigenZoom | null = null;

/** Mide la vista del cartel tocado y la guarda; luego abre la ficha. */
export function abrirConZoom(
  vista: View | null,
  id: number,
  poster: string | null,
  abrir: () => void,
) {
  if (!vista) {
    origen = null;
    abrir();
    return;
  }
  vista.measureInWindow((x, y, width, height) => {
    origen = width > 0 ? { id, rect: { x, y, width, height }, poster } : null;
    abrir();
  });
}

/** El origen guardado para esta peli (o null si se llegó de otra forma: enlace, chat…). */
export function origenDe(id: number): OrigenZoom | null {
  return origen?.id === id ? origen : null;
}
