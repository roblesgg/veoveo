/**
 * ARCHIVO: services/cuentaDatos.ts
 * DESCRIPCIÓN: Tus datos (RGPD): descargarlos en JSON y borrar la cuenta.
 *
 * Borrar la cuenta ANONIMIZA (decisión de Álvaro): tus mensajes se quedan en los chats de los
 * demás, pero sin tu perfil la app los firma como «Usuario eliminado». Se borra todo lo demás:
 * amistades, solicitudes, biblioteca, preferencias, privado/, votos de los Match, tu estado en
 * cada chat (miembros) y, al final, el usuario de Auth. Lo permiten las reglas de Firestore sin
 * Cloud Functions; el orden importa (lo que depende de tu perfil va antes de borrarlo).
 */
import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import type { Chat, MovieMatch, UsuarioPerfil } from '../types';
import { dbOrThrow, uidOrThrow } from './firebase';
import { salirDelGrupo } from './repositorioChats';

const MAX_MENSAJES_POR_CHAT = 500;

async function chatsDondeEstoy(yo: string) {
  const snap = await getDocs(query(collection(dbOrThrow(), 'chats'), where('participants', 'array-contains', yo)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chat);
}

async function matchesDondeEstoy(yo: string) {
  const snap = await getDocs(query(collection(dbOrThrow(), 'matches'), where('participants', 'array-contains', yo)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MovieMatch);
}

async function solicitudesMias(yo: string) {
  const ref = collection(dbOrThrow(), 'solicitudes_amistad');
  const [de, para] = await Promise.all([
    getDocs(query(ref, where('deUid', '==', yo))),
    getDocs(query(ref, where('paraUid', '==', yo))),
  ]);
  return [...de.docs, ...para.docs];
}

const datos = async (ref: DocumentReference) => {
  const s = await getDoc(ref);
  return s.exists() ? s.data() : null;
};

/** Todos tus datos en un JSON legible (perfil, cuenta, biblioteca, amistades, chats y Match). */
export async function exportarMisDatos(): Promise<string> {
  const db = dbOrThrow();
  const yo = uidOrThrow();
  const [perfil, cuenta, avisos, preferencias, peliculas, solicitudes, chats, matches] = await Promise.all([
    datos(doc(db, 'usuarios', yo)),
    datos(doc(db, 'usuarios', yo, 'privado', 'cuenta')),
    datos(doc(db, 'usuarios', yo, 'privado', 'avisos')),
    datos(doc(db, 'usuarios', yo, 'perfil', 'preferencias')),
    getDocs(collection(db, 'usuarios', yo, 'peliculas')),
    solicitudesMias(yo),
    chatsDondeEstoy(yo),
    matchesDondeEstoy(yo),
  ]);

  const misMensajes = await Promise.all(
    chats.map(async (c) => {
      const snap = await getDocs(
        query(collection(db, 'chats', c.id, 'msj'), where('senderId', '==', yo), limit(MAX_MENSAJES_POR_CHAT)),
      ).catch(() => null);
      return {
        chat: c.id,
        tipo: c.type,
        nombre: c.name ?? null,
        participantes: c.participants,
        mensajes: (snap?.docs ?? []).map((d) => {
          const m = d.data();
          return { fecha: new Date(m.timestamp).toISOString(), tipo: m.type, texto: m.eliminado ? null : m.text };
        }),
      };
    }),
  );
  const misVotos = await Promise.all(
    matches.map(async (m) => ({ match: m.id, votos: await datos(doc(db, 'matches', m.id, 'votos', yo)).catch(() => null) })),
  );

  // El token de avisos identifica el dispositivo, no a ti: se indica si existe, sin copiarlo
  const { pushToken, ...restoAvisos } = (avisos ?? {}) as { pushToken?: string };
  return JSON.stringify(
    {
      exportado: new Date().toISOString(),
      aplicacion: 'VeoVeo',
      perfil,
      cuenta,
      avisos: { ...restoAvisos, tokenDeAvisosGuardado: Boolean(pushToken) },
      preferencias,
      biblioteca: peliculas.docs.map((d) => d.data()),
      solicitudes: solicitudes.map((d) => ({ id: d.id, ...d.data() })),
      chats: misMensajes,
      movieMatch: misVotos,
    },
    null,
    2,
  );
}

export type PasoBorrado = 'amistades' | 'solicitudes' | 'chats' | 'match' | 'biblioteca' | 'perfil';

/**
 * Borra tus datos de Firestore. Antes hay que reautenticar (si no, Auth no deja borrar el
 * usuario al final y quedaría a medias). El usuario de Auth lo borra quien llama, después.
 */
export async function borrarMisDatos(alAvanzar?: (paso: PasoBorrado) => void): Promise<void> {
  const db = dbOrThrow();
  const yo = uidOrThrow();
  const perfil = (await datos(doc(db, 'usuarios', yo))) as UsuarioPerfil | null;

  // 1. Amistades: me quito de la lista de cada amigo (las reglas lo permiten solo para mí)
  alAvanzar?.('amistades');
  await Promise.all(
    (perfil?.amigos ?? []).map((amigo) =>
      updateDoc(doc(db, 'usuarios', amigo), { amigos: arrayRemove(yo) }).catch(() => undefined),
    ),
  );

  // 2. Solicitudes enviadas y recibidas
  alAvanzar?.('solicitudes');
  await Promise.all((await solicitudesMias(yo)).map((d) => deleteDoc(d.ref).catch(() => undefined)));

  // 3. Chats: fuera de los grupos y sin mi estado (leído, silenciado). Los mensajes se quedan.
  alAvanzar?.('chats');
  for (const chat of await chatsDondeEstoy(yo)) {
    await deleteDoc(doc(db, 'chats', chat.id, 'miembros', yo)).catch(() => undefined);
    if (chat.type === 'group') await salirDelGrupo(chat).catch(() => undefined);
  }

  // 4. Movie Match: mis votos fuera; los que estaban en curso se cancelan
  alAvanzar?.('match');
  for (const m of await matchesDondeEstoy(yo)) {
    await deleteDoc(doc(db, 'matches', m.id, 'votos', yo)).catch(() => undefined);
    if (m.estado === 'active') await updateDoc(doc(db, 'matches', m.id), { estado: 'cancelled' }).catch(() => undefined);
  }

  // 5. Biblioteca (en lotes de 400)
  alAvanzar?.('biblioteca');
  const pelis = await getDocs(collection(db, 'usuarios', yo, 'peliculas'));
  for (let i = 0; i < pelis.docs.length; i += 400) {
    const lote = writeBatch(db);
    pelis.docs.slice(i, i + 400).forEach((d) => lote.delete(d.ref));
    await lote.commit();
  }

  // 6. Preferencias, privado/ y, lo último, el perfil público
  alAvanzar?.('perfil');
  const lote = writeBatch(db);
  lote.delete(doc(db, 'usuarios', yo, 'perfil', 'preferencias'));
  lote.delete(doc(db, 'usuarios', yo, 'privado', 'chats'));
  lote.delete(doc(db, 'usuarios', yo, 'privado', 'avisos'));
  lote.delete(doc(db, 'usuarios', yo, 'privado', 'cuenta'));
  lote.delete(doc(db, 'usuarios', yo));
  await lote.commit();
}
