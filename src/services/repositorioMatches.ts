/**
 * ARCHIVO: services/repositorioMatches.ts
 * DESCRIPCIÓN: Movie Match (modelo 3.0).
 * - `matches/{id}`: participantes, objetivo, mazo fijo (lo genera quien crea), coincidencias.
 * - `matches/{id}/votos/{uid}`: los "sí" y "no" de cada uno; solo los escribe su dueño.
 * Las coincidencias las calcula cada móvil con los votos de todos y las registra en una
 * transacción; quien hace que se llegue al objetivo (o termina antes) avisa al resto.
 */

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  addDoc,
} from 'firebase/firestore';
import type { Chat, MovieMatch, VotosMatch } from '../types';
import { dbOrThrow, uidOrThrow } from './firebase';
import { generarMazo } from './mazoMatch';
import { enlazarMatch, enviarMensaje, obtenerChat } from './repositorioChats';
import { notificarAUsuario } from './notificationService';

const refMatch = (id: string) => doc(dbOrThrow(), 'matches', id);
const refVotos = (id: string, uid: string) => doc(dbOrThrow(), 'matches', id, 'votos', uid);

/** Un Match del modelo anterior (mapas compartidos) no tiene mazo: no se puede jugar. */
export const esMatchAntiguo = (m: MovieMatch) => !Array.isArray(m.mazo);

/**
 * Crea un Match. Desde un chat juegan todos sus participantes; sin chat, los amigos elegidos.
 * Genera el mazo aquí, una sola vez.
 */
export async function crearMatch(opciones: {
  chat?: Chat | null;
  participantes: string[];
  objetivo: number;
  nombreCreador: string;
}): Promise<string> {
  const yo = uidOrThrow();
  const participantes = [...new Set([yo, ...opciones.participantes])];
  const mazo = await generarMazo(participantes);
  const ref = await addDoc(collection(dbOrThrow(), 'matches'), {
    ...(opciones.chat ? { chatId: opciones.chat.id } : {}),
    creatorId: yo,
    participants: participantes,
    objetivo: opciones.objetivo,
    estado: 'active',
    mazo,
    coincidencias: [],
    createdAt: Date.now(),
  });

  if (opciones.chat) {
    await enlazarMatch(opciones.chat.id, ref.id);
    // El mensaje ya avisa a los miembros del chat
    await enviarMensaje(
      opciones.chat,
      {
        type: 'match_invite',
        text: `Movie Match: buscamos ${opciones.objetivo} ${opciones.objetivo === 1 ? 'peli' : 'pelis'} en común`,
        matchId: ref.id,
      },
      opciones.nombreCreador,
    );
  } else {
    await Promise.all(
      participantes
        .filter((uid) => uid !== yo)
        .map((uid) =>
          notificarAUsuario(
            uid,
            `${opciones.nombreCreador} te invita a un Movie Match`,
            'Desliza y encontrad qué ver juntos.',
            {
              type: 'match',
              matchId: ref.id,
              url: `veoveo://match/${ref.id}`,
            },
          ).catch(() => undefined),
        ),
    );
  }
  return ref.id;
}

export function observarMatch(
  matchId: string,
  onCambio: (m: MovieMatch | null) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    refMatch(matchId),
    (snap) => onCambio(snap.exists() ? ({ id: snap.id, ...snap.data() } as MovieMatch) : null),
    onError,
  );
}

/** Votos de todos los participantes (para mi progreso y las coincidencias). */
export function observarVotos(
  matchId: string,
  onCambio: (votos: Record<string, VotosMatch>) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    collection(dbOrThrow(), 'matches', matchId, 'votos'),
    (snap) => {
      const votos: Record<string, VotosMatch> = {};
      snap.docs.forEach((d) => {
        const v = d.data() as Partial<VotosMatch>;
        votos[d.id] = { si: v.si ?? [], no: v.no ?? [], actualizadoEn: v.actualizadoEn };
      });
      onCambio(votos);
    },
    onError,
  );
}

/** Mis Matches en curso (para volver a uno sin chat). Necesita el índice de firestore.indexes.json. */
export function observarMisMatchesActivos(
  uid: string,
  onCambio: (matches: MovieMatch[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(
    collection(dbOrThrow(), 'matches'),
    where('participants', 'array-contains', uid),
    where('estado', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(10),
  );
  return onSnapshot(
    q,
    (snap) => onCambio(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MovieMatch)),
    onError,
  );
}

/** Vota una carta: sí (derecha) o no (izquierda). */
export async function votar(matchId: string, peliId: number, si: boolean) {
  const yo = uidOrThrow();
  await setDoc(
    refVotos(matchId, yo),
    { [si ? 'si' : 'no']: arrayUnion(peliId), actualizadoEn: Date.now() },
    { merge: true },
  );
}

/** Deshace el voto de una carta (botón "deshacer"). */
export async function deshacerVoto(matchId: string, peliId: number) {
  const yo = uidOrThrow();
  await setDoc(
    refVotos(matchId, yo),
    { si: arrayRemove(peliId), no: arrayRemove(peliId), actualizadoEn: Date.now() },
    { merge: true },
  );
}

/** Las cartas en las que todos los participantes han dicho que sí, en el orden del mazo. */
export function calcularCoincidencias(
  match: MovieMatch,
  votos: Record<string, VotosMatch>,
): number[] {
  const sies = match.participants.map((uid) => new Set(votos[uid]?.si ?? []));
  return match.mazo.filter((c) => sies.every((s) => s.has(c.id))).map((c) => c.id);
}

/**
 * Registra coincidencias nuevas. Si con ellas se llega al objetivo, termina el Match.
 * Devuelve true si ESTA llamada lo ha terminado (y entonces avisa al resto).
 */
export async function registrarCoincidencias(
  match: MovieMatch,
  calculadas: number[],
): Promise<boolean> {
  const nuevas = calculadas.filter((id) => !match.coincidencias.includes(id));
  if (nuevas.length === 0 || match.estado !== 'active') return false;
  const termina = await runTransaction(dbOrThrow(), async (tx) => {
    const snap = await tx.get(refMatch(match.id));
    const actual = snap.data() as MovieMatch | undefined;
    if (!actual || actual.estado !== 'active') return false;
    const todas = [...new Set([...actual.coincidencias, ...calculadas])];
    if (todas.length === actual.coincidencias.length) return false;
    const llega = todas.length >= actual.objetivo;
    tx.update(refMatch(match.id), {
      coincidencias: todas,
      ...(llega ? { estado: 'finished', finishedAt: Date.now() } : {}),
    });
    return llega;
  });
  if (termina)
    await avisarFin(
      { ...match, coincidencias: [...new Set([...match.coincidencias, ...calculadas])] },
      null,
    );
  return termina;
}

/** Termina el Match antes de llegar al objetivo. */
export async function terminarMatch(match: MovieMatch, nombre: string): Promise<void> {
  const yo = uidOrThrow();
  const termina = await runTransaction(dbOrThrow(), async (tx) => {
    const snap = await tx.get(refMatch(match.id));
    if ((snap.data() as MovieMatch | undefined)?.estado !== 'active') return false;
    tx.update(refMatch(match.id), { estado: 'finished', terminadoPor: yo, finishedAt: Date.now() });
    return true;
  });
  if (termina) await avisarFin(match, nombre);
}

/** Al terminar: en un chat, mensaje con el resultado y se libera el botón; sin chat, aviso push. */
async function avisarFin(match: MovieMatch, terminadoPorNombre: string | null) {
  const n = match.coincidencias.length;
  const resumen =
    n === 0 ? 'sin coincidencias' : `${n} ${n === 1 ? 'coincidencia' : 'coincidencias'}`;
  const texto = terminadoPorNombre
    ? `${terminadoPorNombre} ha terminado el Movie Match: ${resumen}`
    : `Movie Match terminado: ${resumen}`;
  try {
    if (match.chatId) {
      const chat = await obtenerChat(match.chatId);
      if (!chat) return;
      if (chat.activeMatchId === match.id) await enlazarMatch(chat.id, null);
      await enviarMensaje(
        chat,
        { type: 'match_result', text: texto, matchId: match.id },
        terminadoPorNombre ?? 'Movie Match',
      );
    } else {
      const yo = uidOrThrow();
      await Promise.all(
        match.participants
          .filter((uid) => uid !== yo)
          .map((uid) =>
            notificarAUsuario(uid, 'Movie Match terminado', texto, {
              type: 'match',
              matchId: match.id,
              url: `veoveo://match/${match.id}`,
            }).catch(() => undefined),
          ),
      );
    }
  } catch {
    // El Match ya está terminado; el aviso es un extra
  }
}
