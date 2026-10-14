/**
 * Opciones de diseño a prueba (solo se eligen desde el APK de pruebas, en Ajustes), para que
 * Álvaro compare en su móvil. Se quitan cuando elija.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Portada = 'nitida' | 'desenfocada';
const CLAVE_PORTADA = 'pruebas_portada';

export async function cargarPortada(): Promise<Portada> {
  try {
    return (await AsyncStorage.getItem(CLAVE_PORTADA)) === 'desenfocada' ? 'desenfocada' : 'nitida';
  } catch {
    return 'nitida';
  }
}

export async function guardarPortada(portada: Portada): Promise<void> {
  await AsyncStorage.setItem(CLAVE_PORTADA, portada).catch(() => undefined);
}
