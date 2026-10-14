/**
 * Zoom entre un cartel y su ficha («como en el iPhone»): al tocar un cartel se guarda dónde
 * estaba en pantalla; la ficha (transparente) pone una copia ahí y la hace crecer hasta su
 * portada grande; al volver, la copia se encoge hasta su sitio. No es un elemento compartido de
 * verdad (eso es experimental en nuestra versión y con la arquitectura antigua): es una copia
 * animada que da la misma sensación sin riesgo.
 * Mientras la copia está fuera de su sitio, el cartel original se oculta (sin doble imagen).
 */
import { useSyncExternalStore } from 'react';
import type { View } from 'react-native';

export type Rect = { x: number; y: number; width: number; height: number };
export type OrigenZoom = { id: number; rect: Rect; poster: string | null };

let origen: OrigenZoom | null = null;
// Vista del cartel original que no debe verse mientras su copia vuela
let vistaOculta: View | null = null;
let vistaTocada: View | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

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
  vista.measureInWindow((x, y, width) => {
    // Se mide el contenedor (no se encoge al pulsar); el cartel es 2:3 y empieza arriba
    origen = width > 0 ? { id, rect: { x, y, width, height: (width * 3) / 2 }, poster } : null;
    vistaTocada = origen ? vista : null;
    abrir();
  });
}

/** El origen guardado para esta peli (o null si se llegó de otra forma: enlace, chat…). */
export function origenDe(id: number): OrigenZoom | null {
  return origen?.id === id ? origen : null;
}

/** La ficha avisa: el original se oculta (true) mientras su copia vuela, y vuelve (false). */
export function ocultarOrigen(ocultar: boolean) {
  vistaOculta = ocultar ? vistaTocada : null;
  avisar();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Para el cartel original: ¿está su copia volando fuera de aquí? */
export function useCartelOculto(ref: { current: View | null }): boolean {
  return useSyncExternalStore(suscribir, () => ref.current !== null && ref.current === vistaOculta);
}
