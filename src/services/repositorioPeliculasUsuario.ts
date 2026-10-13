/**
 * ARCHIVO: services/repositorioPeliculasUsuario.ts
 * DESCRIPCIÓN: Gestiona la biblioteca personal de películas de cada usuario.
 * Permite guardar películas como 'por ver' o 'vistas', valorarlas y listarlas.
 * Utiliza subcolecciones dentro del documento de cada usuario en Firestore.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { PeliculaUsuario } from '../types';
import { getFirebaseAuth, getFirestoreDb, dbOrThrow, uidOrThrow } from './firebase';

/** Helper: Genera la referencia al documento de una película en la biblioteca del usuario. */
function refPelicula(uid: string, idPelicula: number) {
  return doc(dbOrThrow(), 'usuarios', uid, 'peliculas', String(idPelicula));
}

/**
 * Escucha en tiempo real toda la biblioteca de un usuario. Devuelve la función para dejar de escuchar.
 */
export function escucharBiblioteca(
  uid: string,
  onCambio: (peliculas: PeliculaUsuario[]) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(
    collection(dbOrThrow(), 'usuarios', uid, 'peliculas'),
    (snap) => onCambio(snap.docs.map((d) => d.data() as PeliculaUsuario)),
    onError,
  );
}

/**
 * Recupera la información de una película específica dentro de la biblioteca del usuario actual.
 */
export async function obtenerPeliculaUsuario(idPelicula: number): Promise<PeliculaUsuario | null> {
  try {
    const uid = getFirebaseAuth()?.currentUser?.uid;
    const db = getFirestoreDb();
    if (!uid || !db) return null;
    const snap = await getDoc(doc(db, 'usuarios', uid, 'peliculas', String(idPelicula)));
    if (!snap.exists()) return null;
    return snap.data() as PeliculaUsuario;
  } catch {
    return null;
  }
}

/** 
 * Recupera la información de una película específica de CUALQUIER usuario (ej: un amigo).
 */
export async function obtenerPeliculaDeUsuario(
  uid: string,
  idPelicula: number,
): Promise<PeliculaUsuario | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'usuarios', uid, 'peliculas', String(idPelicula)));
  if (!snap.exists()) return null;
  return snap.data() as PeliculaUsuario;
}

/** 
 * Obtiene la lista de películas del usuario actual filtradas por estado (por_ver / vista).
 */
export async function listarPeliculasPorEstado(
  estado: 'por_ver' | 'vista',
): Promise<PeliculaUsuario[]> {
  const uid = uidOrThrow();
  const db = dbOrThrow();
  const q = query(collection(db, 'usuarios', uid, 'peliculas'), where('estado', '==', estado));
  const snap = await getDocs(q);
  return snap.docs.map((d: any) => d.data() as PeliculaUsuario);
}

/** 
 * Obtiene la biblioteca de un usuario específico filtrada por estado.
 */
export async function listarPeliculasPorEstadoDeUsuario(
  uid: string,
  estado: 'por_ver' | 'vista',
): Promise<PeliculaUsuario[]> {
  const db = dbOrThrow();
  const q = query(collection(db, 'usuarios', uid, 'peliculas'), where('estado', '==', estado));
  const snap = await getDocs(q);
  return snap.docs.map((d: any) => d.data() as PeliculaUsuario);
}

/** 
 * Añade una película a la biblioteca del usuario.
 */
export async function agregarPelicula(p: PeliculaUsuario): Promise<void> {
  const uid = uidOrThrow();
  await setDoc(refPelicula(uid, p.idPelicula), p);
}

/** 
 * Cambia el estado de una película (ej: de 'por ver' a 'vista').
 */
export async function actualizarEstadoPelicula(
  idPelicula: number,
  nuevoEstado: 'por_ver' | 'vista',
): Promise<void> {
  const uid = uidOrThrow();
  await updateDoc(refPelicula(uid, idPelicula), { estado: nuevoEstado });
}

/** 
 * Actualiza la puntuación de estrellas (1-10) dada por el usuario.
 */
export async function actualizarValoracion(idPelicula: number, valoracion: number): Promise<void> {
  const uid = uidOrThrow();
  await updateDoc(refPelicula(uid, idPelicula), { valoracion });
}

/** 
 * Elimina una película de la biblioteca del usuario.
 */
export async function eliminarPelicula(idPelicula: number): Promise<void> {
  const uid = uidOrThrow();
  await deleteDoc(refPelicula(uid, idPelicula));
}

/** 
 * Cuenta cuántas películas tiene el usuario en un estado determinado.
 */
export async function contarPeliculasPorEstado(estado: string): Promise<number> {
  try {
    const uid = getFirebaseAuth()?.currentUser?.uid;
    const db = getFirestoreDb();
    if (!uid || !db) return 0;
    const q = query(collection(db, 'usuarios', uid, 'peliculas'), where('estado', '==', estado));
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}

/** 
 * Helper de flujo: Elimina la película y la vuelve a añadir como 'por ver'.
 * Útil para reiniciar el estado de una película rápidamente.
 */
export async function reemplazarPorPorVer(
  idPelicula: number,
  titulo: string,
  rutaPoster: string | null,
): Promise<void> {
  await eliminarPelicula(idPelicula);
  await agregarPelicula({
    idPelicula,
    titulo,
    rutaPoster,
    estado: 'por_ver',
    valoracion: 0,
    fechaAnadido: Date.now(),
  });
}
