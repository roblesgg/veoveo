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

/** Datos de la peli que se guardan al añadirla a la biblioteca. */
export type DatosPeliculaBiblioteca = Pick<
  PeliculaUsuario,
  'idPelicula' | 'titulo' | 'rutaPoster' | 'fechaLanzamiento' | 'providers'
>;

/**
 * Marca una peli como vista con UNA sola escritura y sin perder datos:
 * - si no estaba en la biblioteca, la crea con la fecha de vista (hoy si no se indica);
 * - si estaba en Por ver, cambia el estado y guarda la fecha de vista (hoy si no se indica);
 * - si ya estaba vista, cambia la valoración y, SOLO si se indica, la fecha.
 */
export async function marcarComoVista(
  datos: DatosPeliculaBiblioteca,
  existente: PeliculaUsuario | null,
  valoracion: number,
  fechaVisto?: number,
): Promise<void> {
  const uid = uidOrThrow();
  const ref = refPelicula(uid, datos.idPelicula);
  if (existente?.estado === 'vista') {
    await updateDoc(ref, fechaVisto ? { valoracion, fechaVisto } : { valoracion });
  } else if (existente?.estado === 'por_ver') {
    await updateDoc(ref, { estado: 'vista', valoracion, fechaVisto: fechaVisto ?? Date.now() });
  } else {
    await setDoc(ref, sinIndefinidos({
      ...datos,
      estado: 'vista',
      valoracion,
      fechaAnadido: Date.now(),
      fechaVisto: fechaVisto ?? Date.now(),
    }));
  }
}

/** Pone una peli en Por ver (si estaba vista, pierde la valoración y la fecha de vista). */
export async function guardarEnPorVer(datos: DatosPeliculaBiblioteca): Promise<void> {
  const uid = uidOrThrow();
  await setDoc(refPelicula(uid, datos.idPelicula), sinIndefinidos({
    ...datos,
    estado: 'por_ver',
    valoracion: 0,
    fechaAnadido: Date.now(),
  }));
}

/** Cambia la fecha en que el usuario vio la peli. */
export async function actualizarFechaVisto(idPelicula: number, fechaVisto: number): Promise<void> {
  const uid = uidOrThrow();
  await updateDoc(refPelicula(uid, idPelicula), { fechaVisto });
}

/** Fecha de referencia de una peli vista: cuándo se vio o, si no consta, cuándo se añadió. */
export function fechaDeVista(p: PeliculaUsuario): number {
  return p.fechaVisto ?? p.fechaAnadido;
}

// Firestore no acepta `undefined` en los campos.
function sinIndefinidos<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
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
