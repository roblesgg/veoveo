/**
 * ARCHIVO: services/repositorioUsuarios.ts
 * DESCRIPCIÓN: Perfil de usuario en Firestore (modelo 3.0):
 * - `usuarios/{uid}`: perfil público (nombre, foto, bio, estado, amigos, privacidad, código de amigo);
 * - `usuarios/{uid}/privado/cuenta`: correo, bloqueados y versión instalada (solo el dueño);
 * - `usuarios/{uid}/privado/avisos`: token de notificaciones y preferencias (el dueño y sus amigos).
 */

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getFirebaseAuth, getFirestoreDb, dbOrThrow, uidOrThrow } from './firebase';
import {
  PRIVACIDAD_POR_DEFECTO,
  type AvisosPrivados,
  type CuentaPrivada,
  type Privacidad,
  type UsuarioPerfil,
} from '../types';

const refPerfil = (uid: string) => doc(dbOrThrow(), 'usuarios', uid);
const refCuenta = (uid: string) => doc(dbOrThrow(), 'usuarios', uid, 'privado', 'cuenta');
const refAvisos = (uid: string) => doc(dbOrThrow(), 'usuarios', uid, 'privado', 'avisos');

// ── Lectura ──────────────────────────────────────────────────────

/** Perfil público del usuario con sesión. */
export async function obtenerPerfilUsuario(): Promise<UsuarioPerfil | null> {
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!getFirestoreDb() || !uid) return null;
  return obtenerPerfilUsuarioPorUid(uid);
}

/** Perfil público de cualquier usuario. */
export async function obtenerPerfilUsuarioPorUid(uid: string): Promise<UsuarioPerfil | null> {
  if (!getFirestoreDb() || !uid) return null;
  const snap = await getDoc(refPerfil(uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UsuarioPerfil) : null;
}

export const obtenerUsuarioPorUid = obtenerPerfilUsuarioPorUid;

/** Escucha el perfil público de un usuario. Devuelve la función para dejar de escuchar. */
export function observarUsuario(uid: string, onCambio: (perfil: UsuarioPerfil) => void): () => void {
  return onSnapshot(refPerfil(uid), (snap) => {
    if (snap.exists()) onCambio({ uid: snap.id, ...snap.data() } as UsuarioPerfil);
  });
}

/** Datos privados de mi cuenta. */
export async function obtenerCuentaPrivada(): Promise<CuentaPrivada> {
  const snap = await getDoc(refCuenta(uidOrThrow()));
  return snap.exists() ? (snap.data() as CuentaPrivada) : {};
}

/** Escucha mis bloqueados (para filtrar buscador, chats y Social). */
export function observarBloqueados(onCambio: (uids: string[]) => void): () => void {
  return onSnapshot(refCuenta(uidOrThrow()), (snap) => onCambio(snap.data()?.bloqueados ?? []));
}

export async function obtenerBloqueadosUids(): Promise<string[]> {
  return (await obtenerCuentaPrivada()).bloqueados ?? [];
}

/** Avisos de otro usuario (solo si somos amigos; si no, las reglas lo impiden y devuelve null). */
export async function obtenerAvisos(uid: string): Promise<AvisosPrivados | null> {
  try {
    const snap = await getDoc(refAvisos(uid));
    return snap.exists() ? (snap.data() as AvisosPrivados) : null;
  } catch {
    return null;
  }
}

export async function obtenerCantidadAmigos(): Promise<number> {
  const perfil = await obtenerPerfilUsuario();
  return perfil?.amigos?.length ?? 0;
}

// ── Escritura ────────────────────────────────────────────────────

export async function actualizarUsername(nuevoUsername: string): Promise<void> {
  const limpio = nuevoUsername.trim();
  if (limpio.length < 3) throw new Error('El nombre debe tener al menos 3 caracteres');
  if (limpio.length > 24) throw new Error('El nombre puede tener 24 caracteres como mucho');
  await updateDoc(refPerfil(uidOrThrow()), { username: limpio, username_servido: limpio.toLowerCase() });
}

export async function actualizarBio(bio: string): Promise<void> {
  const limpia = bio.trim().slice(0, 140);
  await updateDoc(refPerfil(uidOrThrow()), { bio: limpia });
}

export async function actualizarFotoPerfil(url: string): Promise<void> {
  await updateDoc(refPerfil(uidOrThrow()), { fotoPerfil: url });
}

export async function actualizarPrivacidad(cambios: Partial<Privacidad>): Promise<void> {
  const perfil = await obtenerPerfilUsuario();
  await updateDoc(refPerfil(uidOrThrow()), {
    privacidad: { ...PRIVACIDAD_POR_DEFECTO, ...perfil?.privacidad, ...cambios },
  });
}

export async function bloquearEnCuenta(uid: string): Promise<void> {
  await setDoc(refCuenta(uidOrThrow()), { bloqueados: arrayUnion(uid) }, { merge: true });
}

export async function desbloquearUsuario(uid: string): Promise<void> {
  await setDoc(refCuenta(uidOrThrow()), { bloqueados: arrayRemove(uid) }, { merge: true });
}

/** Guarda el token de notificaciones del usuario actual (tras aceptar el permiso). */
export async function guardarPushToken(token: string): Promise<void> {
  await setDoc(refAvisos(uidOrThrow()), { pushToken: token }, { merge: true });
}

export async function guardarPreferenciasAvisos(
  notificaciones: NonNullable<AvisosPrivados['notificaciones']>,
): Promise<void> {
  await setDoc(refAvisos(uidOrThrow()), { notificaciones }, { merge: true });
}

// ── Presencia ────────────────────────────────────────────────────

// Último estado escrito, para no escribir en Firestore en cada cambio de plano.
let ultimoEstado: { estado: string; momento: number } | null = null;
const PAUSA_ENTRE_ESTADOS = 1000 * 60 * 2;

/** Estado de presencia. Si es el mismo que el último escrito hace menos de 2 minutos, no escribe. */
export async function actualizarEstadoConexion(estado: 'online' | 'offline' | 'ausente'): Promise<void> {
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!getFirestoreDb() || !uid) return;
  const ahora = Date.now();
  if (estado !== 'offline' && ultimoEstado?.estado === estado && ahora - ultimoEstado.momento < PAUSA_ENTRE_ESTADOS) {
    return;
  }
  ultimoEstado = { estado, momento: ahora };
  await updateDoc(refPerfil(uid), { estado, ultimoAcceso: ahora });
}

// ── Inicio de sesión ─────────────────────────────────────────────

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Código de amigo de 6 caracteres que no use nadie más. */
async function generarCodigoAmigo(): Promise<string> {
  for (let intento = 0; intento < 5; intento++) {
    const codigo = Array.from({ length: 6 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('');
    const ocupado = await getDocs(query(collection(dbOrThrow(), 'usuarios'), where('codigoAmigo', '==', codigo), limit(1)));
    if (ocupado.empty) return codigo;
  }
  throw new Error('No se pudo generar un código de amigo');
}

/**
 * Al abrir la app con sesión: crea el perfil si no existe e importa la foto de Google si falta.
 * Devuelve el perfil público.
 */
export async function asegurarPerfilFirestore(user: User): Promise<UsuarioPerfil | null> {
  if (!getFirestoreDb() || !user) return null;
  const snap = await getDoc(refPerfil(user.uid));

  if (!snap.exists()) {
    const username = (user.displayName || `Usuario_${user.uid.slice(0, 6)}`).slice(0, 24);
    const nuevo: UsuarioPerfil = {
      uid: user.uid,
      username,
      username_servido: username.toLowerCase(),
      codigoAmigo: await generarCodigoAmigo(),
      fotoPerfil: user.photoURL || null,
      amigos: [],
      fechaCreacion: Date.now(),
      privacidad: PRIVACIDAD_POR_DEFECTO,
    };
    const lote = writeBatch(dbOrThrow());
    lote.set(refPerfil(user.uid), nuevo);
    lote.set(refCuenta(user.uid), { email: user.email ?? null, bloqueados: [] }, { merge: true });
    await lote.commit();
    return nuevo;
  }

  const data = { uid: snap.id, ...snap.data() } as UsuarioPerfil;
  const cambios: Partial<UsuarioPerfil> = {};
  if (!data.fotoPerfil && user.photoURL) cambios.fotoPerfil = user.photoURL;
  if (!data.username_servido && data.username) cambios.username_servido = data.username.toLowerCase();
  if (!data.privacidad) cambios.privacidad = PRIVACIDAD_POR_DEFECTO;
  if (!data.codigoAmigo) cambios.codigoAmigo = await generarCodigoAmigo();
  if (Object.keys(cambios).length > 0) await updateDoc(refPerfil(user.uid), cambios);
  return { ...data, ...cambios };
}

/**
 * Al iniciar sesión: estado online (perfil), versión instalada (privado) y token (avisos)
 * en un solo lote. El token solo se escribe si ha cambiado.
 */
export async function registrarSesion(uid: string, pushToken: string | null): Promise<void> {
  if (!getFirestoreDb() || !uid) return;
  const ahora = Date.now();
  const lote = writeBatch(dbOrThrow());
  lote.update(refPerfil(uid), { estado: 'online', ultimoAcceso: ahora });
  lote.set(
    refCuenta(uid),
    {
      email: getFirebaseAuth()?.currentUser?.email ?? null,
      appVersion: Constants.expoConfig?.version || '0.0.0',
      appVersionCode: Constants.expoConfig?.android?.versionCode ?? 0,
      platform: Platform.OS,
    },
    { merge: true },
  );
  if (pushToken) {
    const avisos = await getDoc(refAvisos(uid));
    if (avisos.data()?.pushToken !== pushToken) lote.set(refAvisos(uid), { pushToken }, { merge: true });
  }
  ultimoEstado = { estado: 'online', momento: ahora };
  await lote.commit();
}
