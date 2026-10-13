import AsyncStorage from '@react-native-async-storage/async-storage';
import { CARRUSELES_POR_DEFECTO, migrarCarruseles } from '../constants/carruseles';

/** Misma clave lógica que PreferencesHelper (SharedPreferences "carruseles_activos"). */
const KEY_CARRUSELES_ACTIVOS = 'carruseles_activos';
const KEY_INCLUIR_ADULTO = 'incluir_adulto';
const KEY_ORDEN_POR_VER = 'orden_por_ver';
const KEY_ORDEN_VISTAS = 'orden_vistas';
const KEY_PLATAFORMAS = 'mis_plataformas';

let cachedPlatforms: string[] | null = null;
let cachedPlatformsPromise: Promise<string[]> | null = null;

/**
 * El contenido para adultos se quitó en la 3.0 (Google Play no lo admite): TMDB se consulta
 * siempre sin él. Borra la preferencia que guardaban las versiones anteriores.
 */
export async function olvidarPreferenciaAdulto(): Promise<void> {
  await AsyncStorage.removeItem(KEY_INCLUIR_ADULTO).catch(() => undefined);
}

/** Ids de los carruseles activos. Convierte los nombres que se guardaban antes de la 3.0. */
export async function cargarCarruselesActivos(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CARRUSELES_ACTIVOS);
    if (raw) return migrarCarruseles(JSON.parse(raw));
  } catch {
    /* sin datos guardados o corruptos: los de por defecto */
  }
  return [...CARRUSELES_POR_DEFECTO];
}

export async function guardarCarruselesActivos(carruseles: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY_CARRUSELES_ACTIVOS, JSON.stringify(carruseles));
}

export async function cargarOrdenBiblioteca(tipo: 'vistas' | 'por_ver'): Promise<string> {
  const key = tipo === 'vistas' ? KEY_ORDEN_VISTAS : KEY_ORDEN_POR_VER;
  return (await AsyncStorage.getItem(key)) || 'recientes';
}

export async function guardarOrdenBiblioteca(
  tipo: 'vistas' | 'por_ver',
  orden: string,
): Promise<void> {
  const key = tipo === 'vistas' ? KEY_ORDEN_VISTAS : KEY_ORDEN_POR_VER;
  await AsyncStorage.setItem(key, orden);
}

export async function cargarPlataformas(): Promise<string[]> {
  if (cachedPlatforms) return cachedPlatforms;
  if (cachedPlatformsPromise) return cachedPlatformsPromise;

  cachedPlatformsPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_PLATAFORMAS);
      cachedPlatforms = raw ? (JSON.parse(raw) as string[]) : [];
      return cachedPlatforms;
    } catch {
      cachedPlatforms = [];
      return cachedPlatforms;
    } finally {
      cachedPlatformsPromise = null;
    }
  })();

  return cachedPlatformsPromise;
}

export async function guardarPlataformas(plataformas: string[]): Promise<void> {
  cachedPlatforms = plataformas;
  await AsyncStorage.setItem(KEY_PLATAFORMAS, JSON.stringify(plataformas));
}
