/**
 * ARCHIVO: services/repositorioChats.ts
 * DESCRIPCIÓN: Chats 1:1 y grupos (modelo 3.0).
 * - `chats/{id}`: participantes, administradores, nombre y emoji del grupo, último mensaje.
 * - `chats/{id}/msj/{id}`: mensajes firmados por su autor (editar, borrar para todos, citar,
 *   ocultar solo para mí).
 * - `chats/{id}/miembros/{uid}`: lo que ven los demás (última lectura para ✓✓, silenciado).
 * - `usuarios/{uid}/privado/chats`: mi estado de cada chat (no leídos, oculto).
 * Las garantías (solo con amigos, firma, administradores) están en firestore.rules.
 */

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  addDoc,
  writeBatch,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Chat, EstadoChatPropio, Message, MiembroChat, MessageType } from '../types';
import { dbOrThrow, uidOrThrow } from './firebase';
import { notificarAUsuario } from './notificationService';

export const MENSAJES_POR_PAGINA = 40;
const refChat = (chatId: string) => doc(dbOrThrow(), 'chats', chatId);
const refMensajes = (chatId: string) => collection(dbOrThrow(), 'chats', chatId, 'msj');
const refMiembro = (chatId: string, uid: string) => doc(dbOrThrow(), 'chats', chatId, 'miembros', uid);
const refEstadoPropio = (uid: string) => doc(dbOrThrow(), 'usuarios', uid, 'privado', 'chats');

/** Momento del último movimiento de un chat, para ordenar la lista. */
export const actividadChat = (c: Chat) => c.lastMessage?.timestamp ?? c.createdAt ?? 0;

// ── Lista de chats ───────────────────────────────────────────────

/** Mis chats, del más reciente al más antiguo (se ordena en el móvil: son pocos). */
export function observarMisChats(uid: string, callback: (chats: Chat[]) => void, onError?: () => void) {
  const q = query(collection(dbOrThrow(), 'chats'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chat);
      callback(chats.sort((a, b) => actividadChat(b) - actividadChat(a)));
    },
    () => onError?.(),
  );
}

/** Mi estado de todos mis chats (no leídos y ocultos) en un solo documento. */
export function observarEstadoPropio(callback: (estado: Record<string, EstadoChatPropio>) => void) {
  return onSnapshot(refEstadoPropio(uidOrThrow()), (snap) => callback((snap.data() as Record<string, EstadoChatPropio>) ?? {}));
}

/** ¿Tiene el chat mensajes de otros sin leer? */
export function tieneNoLeidos(chat: Chat, estado: EstadoChatPropio | undefined, yo: string) {
  const ultimo = chat.lastMessage;
  if (!ultimo || ultimo.senderId === yo) return false;
  return ultimo.timestamp > (estado?.ultimaLectura ?? 0);
}

/**
 * Número de mensajes sin leer (consulta de recuento: cuesta una lectura por cada 1.000).
 * Solo se pide para los chats que tienen no leídos. Como mínimo 1.
 */
export async function contarNoLeidos(chatId: string, desde: number): Promise<number> {
  const snap = await getCountFromServer(query(refMensajes(chatId), where('timestamp', '>', desde)));
  return Math.max(1, snap.data().count);
}

/** ¿Se ve el chat en mi lista? Oculto solo hasta que llegue un mensaje nuevo. */
export function chatVisible(chat: Chat, estado: EstadoChatPropio | undefined) {
  if (!estado?.oculto) return true;
  return actividadChat(chat) > (estado.ocultoDesde ?? 0);
}

// ── Crear chats ──────────────────────────────────────────────────

/**
 * Abre (o reutiliza) el chat individual con un amigo. Solo con amigos: lo exigen las reglas.
 */
export async function abrirChatIndividual(amigoUid: string): Promise<string> {
  const yo = uidOrThrow();
  const existentes = await getDocs(
    query(collection(dbOrThrow(), 'chats'), where('participants', 'array-contains', yo), where('type', '==', 'individual')),
  );
  const existente = existentes.docs.find((d) => (d.data().participants as string[]).includes(amigoUid));
  if (existente) {
    await mostrarChat(existente.id); // si lo había ocultado, vuelve a la lista
    return existente.id;
  }
  const nuevo = await addDoc(collection(dbOrThrow(), 'chats'), {
    type: 'individual',
    participants: [yo, amigoUid],
    admins: [yo],
    createdBy: yo,
    createdAt: Date.now(),
    lastMessage: null,
    activeMatchId: null,
  });
  return nuevo.id;
}

/** Crea un grupo con amigos. Quien lo crea es el administrador. */
export async function crearGrupo(amigos: string[], nombre: string, emoji = '🍿'): Promise<string> {
  const yo = uidOrThrow();
  const limpio = nombre.trim().slice(0, 40) || 'Nuevo grupo';
  const nuevo = await addDoc(collection(dbOrThrow(), 'chats'), {
    type: 'group',
    participants: [yo, ...amigos.filter((a) => a !== yo)],
    admins: [yo],
    createdBy: yo,
    createdAt: Date.now(),
    name: limpio,
    emoji,
    lastMessage: null,
    activeMatchId: null,
  });
  return nuevo.id;
}

// ── Un chat ──────────────────────────────────────────────────────

export function observarChat(chatId: string, onCambio: (chat: Chat | null) => void): () => void {
  return onSnapshot(refChat(chatId), (snap) => onCambio(snap.exists() ? ({ id: snap.id, ...snap.data() } as Chat) : null));
}

/** Lectura única de un chat (null si no existe o no participo). */
export async function obtenerChat(chatId: string): Promise<Chat | null> {
  const snap = await getDoc(refChat(chatId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Chat) : null;
}

/** Estado de los miembros del chat (lectura para ✓✓, silenciado). */
export function observarMiembros(chatId: string, onCambio: (m: Record<string, MiembroChat>) => void): () => void {
  return onSnapshot(collection(dbOrThrow(), 'chats', chatId, 'miembros'), (snap) => {
    const mapa: Record<string, MiembroChat> = {};
    snap.docs.forEach((d) => (mapa[d.id] = d.data() as MiembroChat));
    onCambio(mapa);
  });
}

/**
 * Mensajes más recientes en tiempo real (la primera página). Los anteriores se piden con
 * `cargarMensajesAnteriores`. Devuelve también el cursor para paginar.
 */
export function observarMensajesRecientes(
  chatId: string,
  callback: (mensajes: Message[], cursor: QueryDocumentSnapshot | null) => void,
  onError?: () => void,
) {
  const q = query(refMensajes(chatId), orderBy('timestamp', 'desc'), limit(MENSAJES_POR_PAGINA));
  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message),
        snap.docs.length === MENSAJES_POR_PAGINA ? snap.docs[snap.docs.length - 1] : null,
      );
    },
    () => onError?.(),
  );
}

export async function cargarMensajesAnteriores(chatId: string, cursor: QueryDocumentSnapshot) {
  const snap = await getDocs(query(refMensajes(chatId), orderBy('timestamp', 'desc'), startAfter(cursor), limit(MENSAJES_POR_PAGINA)));
  return {
    mensajes: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message),
    cursor: snap.docs.length === MENSAJES_POR_PAGINA ? snap.docs[snap.docs.length - 1] : null,
  };
}

// ── Mensajes ─────────────────────────────────────────────────────

type NuevoMensaje = {
  type: MessageType;
  text: string;
  respuestaA?: Message['respuestaA'];
  movieData?: Message['movieData'];
  matchId?: string;
};

const resumen = (m: NuevoMensaje) =>
  m.type === 'movie' ? `🎬 ${m.movieData?.title ?? 'Una peli'}` : m.type === 'match_invite' ? '🍿 Movie Match' : m.text;

/**
 * Envía un mensaje firmado, actualiza el resumen del chat y avisa a los demás
 * (salvo a quien lo tiene silenciado). `nombreRemitente` es para el texto del aviso.
 */
export async function enviarMensaje(chat: Chat, mensaje: NuevoMensaje, nombreRemitente: string) {
  const yo = uidOrThrow();
  const ahora = Date.now();
  const texto = mensaje.text.trim().slice(0, 2000);
  await addDoc(refMensajes(chat.id), {
    senderId: yo,
    type: mensaje.type,
    text: texto,
    timestamp: ahora,
    eliminado: false,
    ...(mensaje.respuestaA ? { respuestaA: mensaje.respuestaA } : {}),
    ...(mensaje.movieData ? { movieData: mensaje.movieData } : {}),
    ...(mensaje.matchId ? { matchId: mensaje.matchId } : {}),
  });
  await updateDoc(refChat(chat.id), {
    lastMessage: { text: resumen({ ...mensaje, text: texto }).slice(0, 140), senderId: yo, timestamp: ahora, tipo: mensaje.type },
  });
  void marcarLeido(chat.id, ahora);
  void avisarParticipantes(chat, yo, nombreRemitente, resumen({ ...mensaje, text: texto }));
}

async function avisarParticipantes(chat: Chat, yo: string, nombre: string, texto: string) {
  try {
    const miembros = await getDocs(collection(dbOrThrow(), 'chats', chat.id, 'miembros'));
    const silenciados = new Set(miembros.docs.filter((d) => d.data().silenciado).map((d) => d.id));
    const titulo = chat.type === 'group' ? `${chat.emoji ?? '🍿'} ${chat.name ?? 'Grupo'}` : nombre;
    const cuerpo = chat.type === 'group' ? `${nombre}: ${texto}` : texto;
    await Promise.all(
      chat.participants
        .filter((uid) => uid !== yo && !silenciados.has(uid))
        .map((uid) => notificarAUsuario(uid, titulo, cuerpo.slice(0, 160), { chatId: chat.id, type: 'message', url: `veoveo://chat/${chat.id}` }).catch(() => undefined)),
    );
  } catch {
    // Sin avisos no se pierde el mensaje
  }
}

/** Edita un mensaje propio (queda la marca «editado»). */
export async function editarMensaje(chatId: string, msgId: string, texto: string) {
  const limpio = texto.trim().slice(0, 2000);
  if (!limpio) return;
  await updateDoc(doc(refMensajes(chatId), msgId), { text: limpio, editadoEn: Date.now() });
}

/** Borra un mensaje propio para todos: queda «Mensaje eliminado». */
export async function borrarMensajeParaTodos(chat: Chat, mensaje: Message) {
  const lote = writeBatch(dbOrThrow());
  lote.update(doc(refMensajes(chat.id), mensaje.id), { text: '', eliminado: true, movieData: null, respuestaA: null });
  if (chat.lastMessage && chat.lastMessage.timestamp === mensaje.timestamp && chat.lastMessage.senderId === mensaje.senderId) {
    lote.update(refChat(chat.id), { lastMessage: { ...chat.lastMessage, text: '', eliminado: true } });
  }
  await lote.commit();
}

/** Oculta un mensaje solo para mí. */
export async function borrarMensajeParaMi(chatId: string, msgId: string) {
  await updateDoc(doc(refMensajes(chatId), msgId), { ocultoPara: arrayUnion(uidOrThrow()) });
}

// ── Mi estado en un chat ─────────────────────────────────────────

/** Marca el chat como leído hasta `momento`: para mis no leídos y para el ✓✓ de los demás. */
export async function marcarLeido(chatId: string, momento = Date.now()) {
  const yo = uidOrThrow();
  await Promise.all([
    setDoc(refEstadoPropio(yo), { [chatId]: { ultimaLectura: momento } }, { merge: true }),
    setDoc(refMiembro(chatId, yo), { ultimaLectura: momento }, { merge: true }),
  ]);
}

/** Silenciar: en miembros (para que quien escribe no avise) y en mi estado (para pintarlo). */
export async function silenciarChat(chatId: string, silenciado: boolean) {
  const yo = uidOrThrow();
  await Promise.all([
    setDoc(refMiembro(chatId, yo), { silenciado }, { merge: true }),
    setDoc(refEstadoPropio(yo), { [chatId]: { silenciado } }, { merge: true }),
  ]);
}

/** «Borrar el chat» para mí: desaparece de mi lista y sus mensajes anteriores dejan de verse. */
export async function ocultarChat(chatId: string) {
  await setDoc(refEstadoPropio(uidOrThrow()), { [chatId]: { oculto: true, ocultoDesde: Date.now() } }, { merge: true });
}

async function mostrarChat(chatId: string) {
  await setDoc(refEstadoPropio(uidOrThrow()), { [chatId]: { oculto: false } }, { merge: true });
}

// ── Grupos ───────────────────────────────────────────────────────

export async function renombrarChat(chatId: string, nombre: string) {
  await updateDoc(refChat(chatId), { name: nombre.trim().slice(0, 40) });
}

export async function cambiarEmojiGrupo(chatId: string, emoji: string) {
  await updateDoc(refChat(chatId), { emoji });
}

/** Añade amigos al grupo (solo administradores; solo sus amigos). */
export async function anadirMiembros(chatId: string, uids: string[]) {
  await updateDoc(refChat(chatId), { participants: arrayUnion(...uids) });
}

/** Quita a un miembro (solo administradores). */
export async function quitarMiembro(chat: Chat, uid: string) {
  await updateDoc(refChat(chat.id), { participants: arrayRemove(uid), admins: arrayRemove(uid) });
}

export async function hacerAdmin(chatId: string, uid: string) {
  await updateDoc(refChat(chatId), { admins: arrayUnion(uid) });
}

/** Salir del grupo. Si era el único administrador, pasa a serlo el siguiente participante. */
export async function salirDelGrupo(chat: Chat) {
  const yo = uidOrThrow();
  const quedan = chat.participants.filter((p) => p !== yo);
  let admins = (chat.admins ?? []).filter((a) => a !== yo);
  if (admins.length === 0 && quedan.length > 0) admins = [quedan[0]];
  await updateDoc(refChat(chat.id), { participants: quedan, admins });
  await ocultarChat(chat.id);
}

/** Vincula un Movie Match en curso al chat. */
export async function enlazarMatch(chatId: string, matchId: string | null) {
  await updateDoc(refChat(chatId), { activeMatchId: matchId });
}

/** Número de chats con mensajes sin leer (para el contador de la barra). */
export function contarChatsNoLeidos(chats: Chat[], estado: Record<string, EstadoChatPropio>, yo: string) {
  return chats.filter((c) => chatVisible(c, estado[c.id]) && tieneNoLeidos(c, estado[c.id], yo)).length;
}
