/**
 * ARCHIVO: services/repositorioConfiguracion.ts
 * DESCRIPCIÓN: Documento público `configuracion/app` (versión mínima y aviso de actualización).
 * Lo escribe solo `scripts/push-version.mjs`; la app solo lo lee.
 */

import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { dbOrThrow } from './firebase';

export type ConfiguracionApp = Record<string, unknown>;

function refConfiguracion() {
  return doc(dbOrThrow(), 'configuracion', 'app');
}

/** Escucha la configuración en tiempo real. Devuelve la función para dejar de escuchar. */
export function observarConfiguracionApp(onCambio: (config: ConfiguracionApp) => void): () => void {
  return onSnapshot(refConfiguracion(), (snap) => {
    if (snap.exists()) onCambio(snap.data());
  });
}

export async function obtenerConfiguracionApp(): Promise<ConfiguracionApp | null> {
  const snap = await getDoc(refConfiguracion());
  return snap.exists() ? snap.data() : null;
}
