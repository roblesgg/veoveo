/**
 * Medición del arranque en frío, solo en la versión de pruebas (VeoVeo Test).
 * Escribe en el log de Android (`adb logcat -s ReactNativeJS`) el tiempo desde
 * que arranca el JavaScript hasta cada hito y cuántas peticiones a TMDB se han hecho.
 * No guarda ni envía nada.
 */
import Constants from 'expo-constants';

const inicio = Date.now();
const activa = Constants.expoConfig?.name?.includes('Test') ?? false;
const hitosMarcados = new Set<string>();
let peticionesTmdb = 0;

export function contarPeticionTmdb() {
  peticionesTmdb += 1;
}

/** Marca un hito una sola vez por arranque. */
export function marcarHito(hito: string) {
  if (!activa || hitosMarcados.has(hito)) return;
  hitosMarcados.add(hito);
  console.info(
    `[VeoVeo:arranque] ${hito}: ${Date.now() - inicio} ms · TMDB: ${peticionesTmdb} peticiones`,
  );
}
