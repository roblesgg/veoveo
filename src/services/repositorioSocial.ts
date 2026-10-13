/**
 * ARCHIVO: services/repositorioSocial.ts
 * DESCRIPCIÓN: Capa social (modelo 3.0): amigos, solicitudes ({de}_{para}), buscador, bloqueos
 * y actividad de los amigos. Las garantías están en las reglas de Firestore (firestore.rules);
 * aquí se hace además el filtrado que espera la gente (por ejemplo, ocultar a los bloqueados).
 */

import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
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
import type { SolicitudAmistad, UsuarioPerfil } from '../types';
import { dbOrThrow, uidOrThrow } from './firebase';
import { bloquearEnCuenta, obtenerBloqueadosUids } from './repositorioUsuarios';

const MAX_IN = 30;

function trocear<T>(items: T[], tamano: number) {
  const trozos: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) trozos.push(items.slice(i, i + tamano));
  return trozos;
}

async function getPerfil(uid: string): Promise<UsuarioPerfil | null> {
  const snap = await getDoc(doc(dbOrThrow(), 'usuarios', uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UsuarioPerfil) : null;
}

/** Perfiles de una lista de uids (de 30 en 30, con límite como piden las reglas). */
async function perfilesDe(uids: string[]): Promise<UsuarioPerfil[]> {
  const db = dbOrThrow();
  const trozos = await Promise.all(
    trocear(uids, MAX_IN).map((grupo) =>
      getDocs(query(collection(db, 'usuarios'), where(documentId(), 'in', grupo), limit(MAX_IN))),
    ),
  );
  return trozos.flatMap((snap) =>
    snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UsuarioPerfil),
  );
}

const idSolicitud = (de: string, para: string) => `${de}_${para}`;
const CODIGO_AMIGO = /^[A-HJ-NP-Z2-9]{6}$/;

// ── Buscador ─────────────────────────────────────────────────────

/**
 * Busca por nombre de usuario EXACTO o por código de amigo (6 caracteres). Consulta puntual:
 * nunca descarga la colección. Oculta mis bloqueados (la garantía real está en las reglas:
 * un bloqueado no puede escribirme ni enviarme solicitud).
 */
export async function buscarUsuarios(texto: string): Promise<UsuarioPerfil[]> {
  const db = dbOrThrow();
  const yo = uidOrThrow();
  const limpio = texto.trim();
  if (limpio.length < 3) return [];

  const esCodigo = CODIGO_AMIGO.test(limpio.toUpperCase());
  const [porNombre, porCodigo, bloqueados] = await Promise.all([
    getDocs(
      query(
        collection(db, 'usuarios'),
        where('username_servido', '==', limpio.toLowerCase()),
        limit(10),
      ),
    ),
    esCodigo
      ? getDocs(
          query(
            collection(db, 'usuarios'),
            where('codigoAmigo', '==', limpio.toUpperCase()),
            limit(1),
          ),
        )
      : Promise.resolve(null),
    obtenerBloqueadosUids().catch(() => [] as string[]),
  ]);

  const vistos = new Set<string>();
  return [...porNombre.docs, ...(porCodigo?.docs ?? [])]
    .map((d) => ({ uid: d.id, ...d.data() }) as UsuarioPerfil)
    .filter((u) => {
      if (u.uid === yo || vistos.has(u.uid) || bloqueados.includes(u.uid)) return false;
      vistos.add(u.uid);
      return true;
    });
}

// ── Amigos ───────────────────────────────────────────────────────

export async function obtenerAmigos(): Promise<UsuarioPerfil[]> {
  const perfil = await getPerfil(uidOrThrow());
  if (!perfil?.amigos?.length) return [];
  return perfilesDe(perfil.amigos);
}

/** Escucha mi lista de amigos (y su estado de conexión). */
export function observarAmigos(callback: (amigos: UsuarioPerfil[]) => void): () => void {
  const db = dbOrThrow();
  let yo: string;
  try {
    yo = uidOrThrow();
  } catch {
    return () => {};
  }
  let dejarAmigos: (() => void)[] = [];
  const parar = () => {
    dejarAmigos.forEach((f) => f());
    dejarAmigos = [];
  };

  const dejarPerfil = onSnapshot(doc(db, 'usuarios', yo), (snap) => {
    parar();
    const amigos = (snap.data()?.amigos as string[] | undefined) ?? [];
    if (amigos.length === 0) {
      callback([]);
      return;
    }
    const porTrozo: UsuarioPerfil[][] = [];
    trocear(amigos, MAX_IN).forEach((grupo, i) => {
      const q = query(collection(db, 'usuarios'), where(documentId(), 'in', grupo), limit(MAX_IN));
      dejarAmigos.push(
        onSnapshot(q, (s) => {
          porTrozo[i] = s.docs.map((d) => ({ uid: d.id, ...d.data() }) as UsuarioPerfil);
          callback(porTrozo.flat());
        }),
      );
    });
  });

  return () => {
    dejarPerfil();
    parar();
  };
}

/** Quita la amistad en los dos perfiles, en una sola escritura. */
export async function eliminarAmigo(amigoUid: string): Promise<void> {
  const db = dbOrThrow();
  const yo = uidOrThrow();
  const lote = writeBatch(db);
  lote.update(doc(db, 'usuarios', yo), { amigos: arrayRemove(amigoUid) });
  lote.update(doc(db, 'usuarios', amigoUid), { amigos: arrayRemove(yo) });
  await lote.commit();
}

/**
 * Bloquea: rompe la amistad, cancela las solicitudes pendientes entre los dos y apunta
 * el bloqueo en mis datos privados.
 */
export async function bloquearUsuario(uid: string): Promise<void> {
  const db = dbOrThrow();
  const yo = uidOrThrow();
  const perfil = await getPerfil(yo);
  if (perfil?.amigos?.includes(uid)) await eliminarAmigo(uid);
  await Promise.all([
    deleteDoc(doc(db, 'solicitudes_amistad', idSolicitud(yo, uid))).catch(() => undefined),
    deleteDoc(doc(db, 'solicitudes_amistad', idSolicitud(uid, yo))).catch(() => undefined),
  ]);
  await bloquearEnCuenta(uid);
}

// ── Solicitudes ──────────────────────────────────────────────────

export async function obtenerSolicitudesPendientes(): Promise<SolicitudAmistad[]> {
  const q = query(
    collection(dbOrThrow(), 'solicitudes_amistad'),
    where('paraUid', '==', uidOrThrow()),
    where('estado', '==', 'pendiente'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as SolicitudAmistad), id: d.id }));
}

export async function obtenerSolicitudesEnviadasPendientesUids(): Promise<Set<string>> {
  const q = query(
    collection(dbOrThrow(), 'solicitudes_amistad'),
    where('deUid', '==', uidOrThrow()),
    where('estado', '==', 'pendiente'),
  );
  const snap = await getDocs(q);
  return new Set(snap.docs.map((d) => (d.data() as SolicitudAmistad).paraUid).filter(Boolean));
}

/**
 * Envía una solicitud. Si esa persona ya me había rechazado, la solicitud existe y las reglas
 * no dejan volver a enviarla (así no se insiste); quien la rechazó puede borrarla si cambia de idea.
 */
export async function enviarSolicitudAmistad(destUid: string): Promise<void> {
  const yo = uidOrThrow();
  if (destUid === yo) throw new Error('No puedes enviarte una solicitud a ti mismo');
  const miPerfil = await getPerfil(yo);
  if (!miPerfil) throw new Error('No hemos encontrado tu perfil');
  await setDoc(doc(dbOrThrow(), 'solicitudes_amistad', idSolicitud(yo, destUid)), {
    deUid: yo,
    deUsername: miPerfil.username,
    paraUid: destUid,
    estado: 'pendiente',
    fecha: Date.now(),
  });
}

/** Cancela una solicitud que envié. */
export async function cancelarSolicitud(destUid: string): Promise<void> {
  await deleteDoc(doc(dbOrThrow(), 'solicitudes_amistad', idSolicitud(uidOrThrow(), destUid)));
}

/** Acepta: los dos pasan a ser amigos y la solicitud se borra, todo en una sola escritura. */
export async function aceptarSolicitud(solicitudId: string): Promise<void> {
  const db = dbOrThrow();
  const yo = uidOrThrow();
  const snap = await getDoc(doc(db, 'solicitudes_amistad', solicitudId));
  if (!snap.exists()) throw new Error('Esta solicitud ya no existe');
  const sol = snap.data() as SolicitudAmistad;
  if (sol.paraUid !== yo) throw new Error('Esta solicitud no es para ti');

  const lote = writeBatch(db);
  lote.update(doc(db, 'usuarios', sol.deUid), { amigos: arrayUnion(yo) });
  lote.update(doc(db, 'usuarios', yo), { amigos: arrayUnion(sol.deUid) });
  lote.delete(snap.ref);
  await lote.commit();
}

/** Rechaza. La solicitud queda como «rechazada» para que no pueda reenviarse. */
export async function rechazarSolicitud(solicitudId: string): Promise<void> {
  await updateDoc(doc(dbOrThrow(), 'solicitudes_amistad', solicitudId), { estado: 'rechazada' });
}

// ── Actividad de los amigos ──────────────────────────────────────

/** Peli que les ha gustado a uno o varios amigos (para las recomendaciones). */
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

  const amigos = await perfilesDe(amigosUids);
  const nombre = (uid: string) => amigos.find((a) => a.uid === uid)?.username ?? 'Un amigo';
  const porPeli = new Map<number, FavoritaDeAmigos>();

  await Promise.all(
    amigosUids.map(async (uid) => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'usuarios', uid, 'peliculas'),
            where('valoracion', '>=', 4),
            limit(10),
          ),
        );
        snap.docs.forEach((d) => {
          const p = d.data();
          if (p.estado !== 'vista') return;
          const actual: FavoritaDeAmigos = porPeli.get(p.idPelicula) ?? {
            idPelicula: p.idPelicula,
            titulo: p.titulo,
            rutaPoster: p.rutaPoster ?? null,
            amigos: [],
          };
          actual.amigos.push(nombre(uid));
          porPeli.set(p.idPelicula, actual);
        });
      } catch {
        // Amistad de un solo lado o biblioteca privada: las reglas lo impiden y se ignora.
      }
    }),
  );
  return [...porPeli.values()];
}

/** Qué han hecho mis amigos con una peli ("Visto por X amigos" en la ficha). */
export async function obtenerActividadAmigosPelicula(idPelicula: number) {
  const amigos = await obtenerAmigos();
  const db = dbOrThrow();
  const actividad = await Promise.all(
    amigos.map(async (amigo) => {
      try {
        const snap = await getDoc(doc(db, 'usuarios', amigo.uid, 'peliculas', String(idPelicula)));
        if (!snap.exists()) return null;
        const p = snap.data();
        // Quien no enseña sus Vistas en Social tampoco sale como "la ha visto"
        if (p.estado === 'vista' && amigo.privacidad?.vistasEnSocial === false) return null;
        return {
          uid: amigo.uid,
          username: amigo.username,
          foto: amigo.fotoPerfil,
          estado: p.estado as 'por_ver' | 'vista',
          valoracion: p.valoracion as number | undefined,
        };
      } catch {
        return null;
      }
    }),
  );
  return actividad.filter(Boolean);
}
