/**
 * ARCHIVO: services/repositorioSocial.ts
 * DESCRIPCIÓN: Gestiona toda la capa social de la app: amigos, solicitudes de amistad,
 * búsquedas de usuarios y actividad social relacionada con películas.
 */

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  addDoc,
  documentId,
  limit,
} from 'firebase/firestore';
import type { SolicitudAmistad, UsuarioPerfil } from '../types';
import { dbOrThrow, uidOrThrow } from './firebase';

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Obtiene el perfil de un usuario por su UID desde Firestore.
 */
async function getPerfil(uid: string): Promise<UsuarioPerfil | null> {
  const db = dbOrThrow();
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UsuarioPerfil;
}

/** Peli que le ha gustado a uno o varios amigos (para las recomendaciones). */
export type FavoritaDeAmigos = {
  idPelicula: number;
  titulo: string;
  rutaPoster: string | null;
  amigos: string[]; // nombres de usuario
};

/**
 * Pelis bien valoradas (4 o 5 estrellas) por tus amigos.
 * Acotado para el plan gratuito: hasta 10 amigos y 10 pelis de cada uno.
 */
export async function obtenerFavoritasDeAmigos(): Promise<FavoritaDeAmigos[]> {
  const db = dbOrThrow();
  const perfil = await getPerfil(uidOrThrow());
  const amigosUids = (perfil?.amigos ?? []).slice(0, 10);
  if (amigosUids.length === 0) return [];

  const amigos = await Promise.all(amigosUids.map((uid) => getPerfil(uid).catch(() => null)));
  const porPeli = new Map<number, FavoritaDeAmigos>();

  await Promise.all(
    amigosUids.map(async (uid, i) => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'usuarios', uid, 'peliculas'),
            where('valoracion', '>=', 4),
            limit(10),
          ),
        );
        const nombre = amigos[i]?.username ?? 'Un amigo';
        snap.docs.forEach((d) => {
          const p = d.data();
          if (p.estado !== 'vista') return;
          const actual: FavoritaDeAmigos = porPeli.get(p.idPelicula) ?? {
            idPelicula: p.idPelicula,
            titulo: p.titulo,
            rutaPoster: p.rutaPoster ?? null,
            amigos: [],
          };
          actual.amigos.push(nombre);
          porPeli.set(p.idPelicula, actual);
        });
      } catch {
        // Si un amigo ya no lo es (amistad de un solo lado), sus reglas lo impiden: se ignora.
      }
    }),
  );
  return [...porPeli.values()];
}

/**
 * Busca usuarios en la base de datos por nombre de usuario.
 */
export async function buscarUsuarios(queryText: string): Promise<UsuarioPerfil[]> {
  const db = dbOrThrow();
  const uidActual = uidOrThrow();
  if (!queryText.trim()) return [];

  // Optimizable en el futuro con índices de búsqueda o un campo 'username_servido'
  const snap = await getDocs(collection(db, 'usuarios'));
  const q = queryText.toLowerCase().trim();
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as UsuarioPerfil)
    .filter((u) => {
      if (u.uid === uidActual) return false;
      const haystack = (u.username_servido ?? u.username ?? '').toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 20);
}

/**
 * Recupera la lista completa de amigos del usuario actual.
 */
export async function obtenerAmigos(): Promise<UsuarioPerfil[]> {
  const uidActual = uidOrThrow();
  const perfil = await getPerfil(uidActual);
  if (!perfil?.amigos?.length) return [];
  const db = dbOrThrow();
  const queries = chunk(perfil.amigos, 30).map((group) =>
    getDocs(query(collection(db, 'usuarios'), where(documentId(), 'in', group))),
  );
  const snapshots = await Promise.all(queries);
  return snapshots.flatMap((snap) =>
    snap.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }) as UsuarioPerfil),
  );
}

/**
 * Suscripción en tiempo real a la lista de amigos para detectar cambios de estado (online/offline).
 */
export function observarAmigos(callback: (amigos: UsuarioPerfil[]) => void): () => void {
  const db = dbOrThrow();
  let uidActual: string;
  try {
    uidActual = uidOrThrow();
  } catch {
    return () => {};
  }

  let unsubAmigos: (() => void) | null = null;

  // Primero escuchamos el documento del usuario para saber quiénes son sus amigos
  const unsubPerfil = onSnapshot(doc(db, 'usuarios', uidActual), (perfilSnap) => {
    if (unsubAmigos) {
      unsubAmigos();
      unsubAmigos = null;
    }

    if (!perfilSnap.exists()) {
      callback([]);
      return;
    }
    const perfil = perfilSnap.data() as UsuarioPerfil;
    if (!perfil.amigos?.length) {
      callback([]);
      return;
    }

    // Luego escuchamos los documentos de esos amigos en una consulta reactiva
    const qAmigos = query(
      collection(db, 'usuarios'),
      where(documentId(), 'in', perfil.amigos.slice(0, 30)), // Limitado por Firestore 'in' operator
    );

    unsubAmigos = onSnapshot(qAmigos, (amigosSnap) => {
      const listaAmigos = amigosSnap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UsuarioPerfil);
      callback(listaAmigos);
    });
  });

  return () => {
    unsubPerfil();
    if (unsubAmigos) unsubAmigos();
  };
}

/**
 * Obtiene las solicitudes de amistad recibidas que están pendientes.
 */
export async function obtenerSolicitudesPendientes(): Promise<SolicitudAmistad[]> {
  const db = dbOrThrow();
  const uidActual = uidOrThrow();
  const q = query(
    collection(db, 'solicitudes_amistad'),
    where('paraUid', '==', uidActual),
    where('estado', '==', 'pendiente'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as SolicitudAmistad), id: d.id }));
}

/**
 * Obtiene los UIDs de los usuarios a los que ya les hemos enviado una solicitud.
 */
export async function obtenerSolicitudesEnviadasPendientesUids(): Promise<Set<string>> {
  const db = dbOrThrow();
  const uidActual = uidOrThrow();
  const q = query(
    collection(db, 'solicitudes_amistad'),
    where('deUid', '==', uidActual),
    where('estado', '==', 'pendiente'),
  );
  const snap = await getDocs(q);
  return new Set(snap.docs.map((d) => (d.data() as SolicitudAmistad).paraUid).filter(Boolean));
}

/**
 * Envía una nueva solicitud de amistad a otro usuario.
 */
export async function enviarSolicitudAmistad(
  destUid: string,
  paraUsername?: string,
): Promise<void> {
  const db = dbOrThrow();
  const uid = uidOrThrow();

  if (destUid === uid) throw new Error('No puedes enviarte una solicitud a ti mismo');

  const miPerfil = await getPerfil(uid);
  if (!miPerfil) throw new Error('No se pudo obtener tu perfil');

  await addDoc(collection(db, 'solicitudes_amistad'), {
    deUid: uid,
    deUsername: miPerfil.username,
    paraUid: destUid,
    paraUsername: paraUsername ?? '',
    estado: 'pendiente' as const,
    timestamp: Date.now(),
  });
}

/**
 * Acepta una solicitud de amistad y vincula a ambos usuarios.
 */
export async function aceptarSolicitud(solicitudId: string): Promise<void> {
  const db = dbOrThrow();
  const solSnap = await getDoc(doc(db, 'solicitudes_amistad', solicitudId));
  if (!solSnap.exists()) throw new Error('Solicitud no encontrada');
  const sol = solSnap.data() as SolicitudAmistad;

  // Añadir a ambos perfiles como amigos mutuamente
  await updateDoc(doc(db, 'usuarios', sol.deUid), {
    amigos: arrayUnion(sol.paraUid),
  });
  await updateDoc(doc(db, 'usuarios', sol.paraUid), {
    amigos: arrayUnion(sol.deUid),
  });
  // Actualizar el estado de la solicitud
  await updateDoc(doc(db, 'solicitudes_amistad', solicitudId), { estado: 'aceptada' });
}

/**
 * Rechaza una solicitud de amistad.
 */
export async function rechazarSolicitud(solicitudId: string): Promise<void> {
  const db = dbOrThrow();
  await updateDoc(doc(db, 'solicitudes_amistad', solicitudId), { estado: 'rechazada' });
}

/**
 * Elimina la relación de amistad entre dos usuarios.
 */
export async function eliminarAmigo(amigoUid: string): Promise<void> {
  const db = dbOrThrow();
  const uidActual = uidOrThrow();
  await updateDoc(doc(db, 'usuarios', uidActual), {
    amigos: arrayRemove(amigoUid),
  });
  await updateDoc(doc(db, 'usuarios', amigoUid), {
    amigos: arrayRemove(uidActual),
  });
}

/**
 * Bloquea a un usuario (y lo elimina de amigos si lo era).
 */
export async function bloquearUsuario(amigoUid: string): Promise<void> {
  const db = dbOrThrow();
  const uidActual = uidOrThrow();
  await eliminarAmigo(amigoUid); // Limpieza preventiva
  await setDoc(
    doc(db, 'usuarios', uidActual),
    { bloqueados: arrayUnion(amigoUid) },
    { merge: true },
  );
}

/**
 * Obtiene qué han hecho mis amigos con una película específica.
 * Útil para la pantalla de detalle de película ("Visto por X amigos").
 */
export async function obtenerActividadAmigosPelicula(idPelicula: number) {
  const amigos = await obtenerAmigos();
  const { obtenerPeliculaDeUsuario } = require('./repositorioPeliculasUsuario');
  const actividad = await Promise.all(
    amigos.map(async (amigo) => {
      const p = await obtenerPeliculaDeUsuario(amigo.uid, idPelicula);
      if (!p) return null;
      return {
        uid: amigo.uid,
        username: amigo.username,
        foto: amigo.fotoPerfil,
        estado: p.estado,
        valoracion: p.valoracion,
      };
    }),
  );
  return actividad.filter(Boolean);
}

/**
 * Definición local de tipos para la gestión social.
 */
export interface PeliculaUsuario {
  idPelicula: number;
  titulo: string;
  rutaPoster: string | null;
  estado: 'por_ver' | 'vista';
  valoracion?: number;
  fechaAnadido: number;
  fechaLanzamiento?: string;
}

export interface Amigo {
  uid: string;
  username: string;
  fotoPerfil?: string;
}
