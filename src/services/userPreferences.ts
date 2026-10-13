/**
 * ARCHIVO: services/userPreferences.ts
 * DESCRIPCIÓN: Gestiona la sincronización de ajustes de usuario (plataformas, filtros) 
 * entre el almacenamiento local (AsyncStorage) y la nube (Firestore).
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import {
  cargarCarruselesActivos,
  guardarCarruselesActivos,
  cargarPlataformas,
  guardarPlataformas,
} from '../storage/preferences';
import { migrarCarruseles } from '../constants/carruseles';

/**
 * Sincroniza las preferencias del usuario al iniciar sesión.
 * Si existen en Firestore, se descargan. Si no, se suben las locales.
 */
export async function sincronizarPreferenciasConFirestore(userId: string) {
  const db = getFirestoreDb();
  if (!db) return;

  // Ubicación: usuarios/{uid}/perfil/preferencias
  const profileRef = doc(db, 'usuarios', userId, 'perfil', 'preferencias');

  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      // ESCENARIO: Descargar de Firestore a Local (el usuario ya tenía ajustes en la nube)
      if (data.carruseles) {
        // Los nombres anteriores a la 3.0 se convierten a los ids del catálogo nuevo
        await guardarCarruselesActivos(migrarCarruseles(data.carruseles));
      }
      if (data.plataformas) {
        await guardarPlataformas(data.plataformas.map(String));
      }
    } else {
      // ESCENARIO: Subir de Local a Firestore (primera vez que el usuario se sincroniza)
      const localCarruseles = await cargarCarruselesActivos();
      const localPlataformas = await cargarPlataformas();
      await setDoc(
        profileRef,
        {
          carruseles: localCarruseles,
          plataformas: localPlataformas,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    }
  } catch (error) {
    console.error('[userPreferences] Error al sincronizar:', error);
  }
}

/**
 * Guarda una preferencia específica tanto en Firestore como en local (implícito si se usa después de este servicio).
 */
export async function guardarPreferenciaFirestore(
  userId: string,
  key: 'carruseles' | 'plataformas',
  value: any,
) {
  const db = getFirestoreDb();
  if (!db) return;

  const profileRef = doc(db, 'usuarios', userId, 'perfil', 'preferencias');
  try {
    await setDoc(
      profileRef,
      {
        [key]: value,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error(`[userPreferences] Error al guardar ${key}:`, error);
  }
}
