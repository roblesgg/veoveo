/**
 * ARCHIVO: services/repositorioUsuarios.ts
 * DESCRIPCIÓN: Gestiona la persistencia y recuperación de los perfiles de usuario en Firestore.
 * Incluye gestión de nombres de usuario, fotos de perfil, bloqueos y estado de conexión.
 */

import { doc, getDoc, onSnapshot, setDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getFirebaseAuth, getFirestoreDb, dbOrThrow, uidOrThrow } from './firebase';
import type { UsuarioPerfil } from '../types';

/**
 * Obtiene el perfil completo del usuario autenticado actualmente.
 */
export async function obtenerPerfilUsuario(): Promise<UsuarioPerfil | null> {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return null;

  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return null;
  return snap.data() as UsuarioPerfil;
}

/**
 * Obtiene el perfil de cualquier usuario mediante su UID.
 */
export async function obtenerPerfilUsuarioPorUid(uid: string): Promise<UsuarioPerfil | null> {
  const db = getFirestoreDb();
  if (!db || !uid) return null;
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return null;
  return snap.data() as UsuarioPerfil;
}

export const obtenerUsuarioPorUid = obtenerPerfilUsuarioPorUid;

/**
 * Crea un perfil básico en Firestore para nuevos usuarios.
 */
export async function crearPerfilPorDefecto(): Promise<void> {
  const db = dbOrThrow();
  const uid = uidOrThrow();
  const email = getFirebaseAuth()?.currentUser?.email ?? 'sin_email';

  const usuario: UsuarioPerfil = {
    uid,
    username: `Usuario_${uid.slice(0, 6)}`,
    email,
    fotoPerfil: null,
    amigos: [],
    fechaCreacion: Date.now(),
  };

  await setDoc(doc(db, 'usuarios', uid), usuario);
}

/**
 * Actualiza el nombre de pantalla del usuario.
 */
export async function actualizarUsername(nuevoUsername: string): Promise<void> {
  const db = dbOrThrow();
  const uid = uidOrThrow();
  const trimmed = nuevoUsername.trim();
  if (trimmed.length < 3) throw new Error('El nombre debe tener al menos 3 caracteres');

  // Guardamos tanto el username visual como una versión en minúsculas para facilitar búsquedas.
  await setDoc(doc(db, 'usuarios', uid), { 
    username: trimmed,
    username_servido: trimmed.toLowerCase() 
  }, { merge: true });
}

/**
 * Actualiza la URL de la foto de perfil del usuario.
 */
export async function actualizarFotoPerfil(url: string): Promise<void> {
  const db = dbOrThrow();
  const uid = uidOrThrow();
  await updateDoc(doc(db, 'usuarios', uid), { fotoPerfil: url });
}

/**
 * Obtiene el número total de amigos que tiene el usuario actual.
 */
export async function obtenerCantidadAmigos(): Promise<number> {
  const perfil = await obtenerPerfilUsuario();
  return perfil?.amigos?.length ?? 0;
}

/**
 * Obtiene la lista de UIDs de usuarios bloqueados por el usuario actual.
 */
export async function obtenerBloqueadosUids(): Promise<string[]> {
  const perfil = await obtenerPerfilUsuario();
  return perfil?.bloqueados ?? [];
}

/**
 * Elimina un usuario de la lista de bloqueados.
 */
export async function desbloquearUsuario(bloqueadoUid: string): Promise<void> {
  const db = dbOrThrow();
  const uid = uidOrThrow();
  await updateDoc(doc(db, 'usuarios', uid), {
    bloqueados: arrayRemove(bloqueadoUid),
  });
}

// Último estado de presencia escrito, para no escribir en Firestore en cada cambio de plano.
let ultimoEstado: { estado: string; momento: number } | null = null;
const PAUSA_ENTRE_ESTADOS = 1000 * 60 * 2;

/**
 * Actualiza el estado de presencia (online/offline/ausente) en Firestore.
 * Si es el mismo estado que el último escrito hace menos de 2 minutos, no escribe.
 */
export async function actualizarEstadoConexion(
  estado: 'online' | 'offline' | 'ausente',
): Promise<void> {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return;

  const ahora = Date.now();
  if (
    estado !== 'offline' &&
    ultimoEstado?.estado === estado &&
    ahora - ultimoEstado.momento < PAUSA_ENTRE_ESTADOS
  ) {
    return;
  }
  ultimoEstado = { estado, momento: ahora };

  await updateDoc(doc(db, 'usuarios', uid), {
    estado,
    ultimoAcceso: ahora,
  });
}

/** Guarda el token de notificaciones del usuario actual (tras aceptar el permiso). */
export async function guardarPushToken(token: string): Promise<void> {
  await updateDoc(doc(dbOrThrow(), 'usuarios', uidOrThrow()), { pushToken: token });
}

/** Escucha el perfil de un usuario en tiempo real. Devuelve la función para dejar de escuchar. */
export function observarUsuario(uid: string, onCambio: (perfil: UsuarioPerfil) => void): () => void {
  return onSnapshot(doc(dbOrThrow(), 'usuarios', uid), (snap) => {
    if (snap.exists()) onCambio(snap.data() as UsuarioPerfil);
  });
}

/**
 * Al iniciar sesión: estado online, versión instalada y token de notificaciones
 * en UNA sola escritura. El token solo se escribe si ha cambiado.
 */
export async function registrarSesion(
  uid: string,
  perfil: UsuarioPerfil | null,
  pushToken: string | null,
): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !uid) return;

  const ahora = Date.now();
  const cambios: Partial<UsuarioPerfil> = {
    estado: 'online',
    ultimoAcceso: ahora,
    appVersion: Constants.expoConfig?.version || '0.0.0',
    appVersionCode: Constants.expoConfig?.android?.versionCode ?? 0,
    platform: Platform.OS,
  };
  if (pushToken && pushToken !== perfil?.pushToken) cambios.pushToken = pushToken;

  ultimoEstado = { estado: 'online', momento: ahora };
  await setDoc(doc(db, 'usuarios', uid), cambios, { merge: true });
}

/**
 * 🔄 SINCRONIZACIÓN DE PERFIL:
 * Asegura que los datos de Firebase Auth (como la foto de Google)
 * estén replicados en el documento de usuario de Firestore.
 * Se ejecuta cada vez que la app inicia con una sesión activa.
 */
export async function asegurarPerfilFirestore(user: User): Promise<UsuarioPerfil | null> {
  const db = getFirestoreDb();
  if (!db || !user) return null;

  const docRef = doc(db, 'usuarios', user.uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    // Escenario A: Usuario nuevo o primer inicio de sesión
    const username = user.displayName || `Usuario_${user.uid.slice(0, 6)}`;
    const nuevoPerfil: UsuarioPerfil = {
      uid: user.uid,
      username,
      username_servido: username.toLowerCase(),
      email: user.email || 'sin_email',
      fotoPerfil: user.photoURL || null,
      amigos: [],
      fechaCreacion: Date.now(),
    };
    await setDoc(docRef, nuevoPerfil);
    return nuevoPerfil;
  } else {
    // Escenario B: Usuario existente, sincronizamos datos si han cambiado en el proveedor (Google/Apple)
    const data = snap.data() as UsuarioPerfil;
    const updates: any = {};

    // Si no tiene foto en Firestore pero sí en el perfil de Auth, la importamos.
    if (!data.fotoPerfil && user.photoURL) {
      updates.fotoPerfil = user.photoURL;
    }

    // Aseguramos que existe el campo para búsquedas optimizadas.
    if (!data.username_servido && (data.username || user.displayName)) {
      updates.username_servido = (data.username || user.displayName || '').toLowerCase();
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(docRef, updates);
    }
    return { ...data, ...updates };
  }
}
