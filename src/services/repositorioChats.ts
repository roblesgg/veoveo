/**
 * ARCHIVO: services/repositorioChats.ts
 * DESCRIPCIÓN: Gestiona el sistema de mensajería en tiempo real entre usuarios.
 * Incluye la creación de chats, envío de mensajes y notificaciones push automáticas.
 */

import {
  collection,
  doc,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { Chat, Message, ChatType } from '../types';
import { dbOrThrow } from './firebase';
import { notificarAUsuario } from './notificationService';

/**
 * Suscripción en tiempo real a la lista de chats donde participa el usuario.
 */
export function observarMisChats(uid: string, callback: (chats: Chat[]) => void) {
  const db = dbOrThrow();
  const chatsRef = collection(db, 'chats');

  // Buscamos chats donde el UID del usuario esté contenido en el array 'participants'
  const q = query(
    chatsRef,
    where('participants', 'array-contains', uid),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chat));
  });
}

/**
 * Crea una nueva sala de chat (individual o grupal).
 * Para chats individuales, reutiliza el existente si ya hay uno entre los mismos dos usuarios.
 */
export async function crearChat(
  uids: string[],
  type: ChatType = 'individual',
  name?: string,
): Promise<string> {
  const db = dbOrThrow();
  const chatsRef = collection(db, 'chats');

  if (type === 'individual' && uids.length === 2) {
    const snap = await getDocs(
      query(
        chatsRef,
        where('type', '==', 'individual'),
        where('participants', 'array-contains', uids[0]),
      ),
    );
    const existing = snap.docs.find((d) => {
      const parts = d.data().participants as string[];
      return parts.length === 2 && parts.includes(uids[1]);
    });
    if (existing) return existing.id;
  }

  const docRef = await addDoc(chatsRef, {
    type,
    participants: uids,
    createdAt: Date.now(),
    name: name || null,
    lastMessage: null,
    activeMatchId: null,
  });

  return docRef.id;
}

/**
 * Suscripción en tiempo real a los mensajes de un chat específico.
 */
export function obtenerMensajesChat(chatId: string, callback: (msgs: Message[]) => void) {
  const db = dbOrThrow();
  const msgsRef = collection(db, 'chats', chatId, 'msj');
  const q = query(msgsRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message));
  });
}

/**
 * Envía un mensaje y actualiza la previsualización del último mensaje en el chat raíz.
 * Además, dispara notificaciones push a todos los demás participantes.
 */
export async function enviarMensaje(chatId: string, msg: Partial<Message>) {
  const db = dbOrThrow();
  const msgsRef = collection(db, 'chats', chatId, 'msj');
  const now = Date.now();

  // 1. Guardar el mensaje en la subcolección
  await addDoc(msgsRef, {
    ...msg,
    timestamp: now,
  });

  // 2. Actualizar el 'metadata' del chat para la lista de conversaciones
  await updateDoc(doc(db, 'chats', chatId), {
    'lastMessage.text': msg.text,
    'lastMessage.senderId': msg.senderId,
    'lastMessage.timestamp': now,
  });

  // 3. Sistema de Notificaciones Push
  try {
    const chatSnap = await getDoc(doc(db, 'chats', chatId));
    if (chatSnap.exists()) {
      const chatData = chatSnap.data() as Chat;
      // Notificamos a todos excepto al que envía
      const otherParticipants = chatData.participants.filter((pid) => pid !== msg.senderId);

      for (const pid of otherParticipants) {
        await notificarAUsuario(
          pid,
          `Nuevo mensaje de ${msg.senderName || 'alguien'}`,
          msg.text || '',
          { chatId, type: 'message' },
        );
      }
    }
  } catch (error) {
    console.error('Error enviando notificaciones de chat:', error);
  }
}

/** Escucha un chat (participantes, nombre, match activo). Devuelve la función para dejar de escuchar. */
export function observarChat(chatId: string, onCambio: (chat: Chat) => void): () => void {
  return onSnapshot(doc(dbOrThrow(), 'chats', chatId), (snap) => {
    if (snap.exists()) onCambio({ id: snap.id, ...snap.data() } as Chat);
  });
}

/** Cambia el nombre de un grupo. */
export async function renombrarChat(chatId: string, nombre: string): Promise<void> {
  await updateDoc(doc(dbOrThrow(), 'chats', chatId), { name: nombre });
}

/**
 * Elimina permanentemente un chat.
 */
export async function borrarChat(chatId: string) {
  const db = dbOrThrow();
  await deleteDoc(doc(db, 'chats', chatId));
}
