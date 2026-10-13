/**
 * ARCHIVO: services/repositorioMatches.ts
 * DESCRIPCIÓN: Gestiona la lógica del juego 'Movie Match'.
 * Permite que varios usuarios voten películas y detecta cuando todos coinciden
 * en una misma película (Match).
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { MovieMatch, MatchStatus } from '../types';
import { getFirestoreDb } from './firebase';
import { notificarAUsuario } from './notificationService';

/** Helper interno para asegurar conexión a DB */
const obtenerDb = () => {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firebase no configurado');
  return db;
};

/**
 * Inicia una nueva sesión de Movie Match vinculada a un chat.
 */
export async function iniciarMatch(
  chatId: string,
  creatorId: string,
  participants: string[],
  settings: { targetMatches: number; excludeSeen: boolean },
): Promise<string> {
  const db = obtenerDb();
  const matchesRef = collection(db, 'matches');

  const docRef = await addDoc(matchesRef, {
    chatId,
    creatorId,
    participants,
    status: 'active',
    settings,
    matchedMovies: [], // IDs de películas donde todos dijeron SÍ
    votes: {}, // Mapa de IDs de peli -> Array de UIDs que dijeron SÍ
    noVotes: {}, // Mapa de IDs de peli -> Array de UIDs que dijeron NO
    createdAt: Date.now(),
  });

  // Vinculamos la ID del juego al documento del chat para que aparezca la UI de acceso
  await updateDoc(doc(db, 'chats', chatId), {
    activeMatchId: docRef.id,
  });

  return docRef.id;
}

/**
 * Suscripción reactiva al estado de un juego de Match específico.
 */
export function observarMatch(matchId: string, callback: (m: MovieMatch) => void) {
  const db = obtenerDb();
  return onSnapshot(doc(db, 'matches', matchId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as MovieMatch);
    }
  });
}

/**
 * Registra el voto de un usuario para una película y comprueba si se ha producido un Match.
 */
export async function votarPelicula(
  matchId: string,
  uid: string,
  movieId: number,
  vote: 'yes' | 'no',
) {
  const db = obtenerDb();
  const matchDoc = doc(db, 'matches', matchId);
  const snap = await getDoc(matchDoc);
  if (!snap.exists()) return;

  const data = snap.data() as MovieMatch;
  const isYes = vote === 'yes';

  // Actualizamos el campo correspondiente (votes o noVotes)
  const field = isYes ? `votes.${movieId}` : `noVotes.${movieId}`;

  await updateDoc(matchDoc, {
    [field]: arrayUnion(uid),
  });

  // LÓGICA DE MATCH TOTAL:
  if (isYes) {
    const updatedSnap = await getDoc(matchDoc);
    const updatedData = updatedSnap.data() as MovieMatch;
    const currentVotes = updatedData.votes[movieId] || [];

    // Si el número de votos positivos es igual al número de participantes... ¡MATCH!
    if (currentVotes.length === data.participants.length) {
      await updateDoc(matchDoc, {
        matchedMovies: arrayUnion(movieId),
      });

      // Notificamos a todos los participantes del éxito
      for (const pid of data.participants) {
        await notificarAUsuario(
          pid,
          '🍿 ¡Tenemos un Match!',
          `Todos habéis coincidido en una película. ¡A verla!`,
          { matchId, type: 'match' },
        );
      }

      // Comprobamos si hemos alcanzado el objetivo de películas (ej: 3 películas)
      const finalSnap = await getDoc(matchDoc);
      const finalData = finalSnap.data() as MovieMatch;
      if (finalData.matchedMovies.length >= data.settings.targetMatches) {
        // Finalizamos el juego
        await updateDoc(matchDoc, {
          status: 'finished' as MatchStatus,
          finishedAt: Date.now(),
        });
        // Desvinculamos el juego del chat
        await updateDoc(doc(db, 'chats', data.chatId), {
          activeMatchId: null,
        });
      }
    }
  }
}
