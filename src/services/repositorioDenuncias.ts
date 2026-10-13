/**
 * ARCHIVO: services/repositorioDenuncias.ts
 * DESCRIPCIÓN: Denunciar a un usuario, un mensaje o un grupo (lo exige Google Play para el
 * contenido que crean los usuarios). La denuncia solo se crea: nadie la lee desde la app;
 * se revisa desde la consola (scripts/ver-denuncias.mjs).
 */
import { addDoc, collection } from 'firebase/firestore';
import { dbOrThrow, uidOrThrow } from './firebase';

export type TipoDenuncia = 'usuario' | 'mensaje' | 'chat';

/** Mismos identificadores que valida firestore.rules */
export const MOTIVOS_DENUNCIA = [
  { id: 'spam', texto: 'Spam o publicidad' },
  { id: 'acoso', texto: 'Acoso o insultos' },
  { id: 'odio', texto: 'Odio o discriminación' },
  { id: 'sexual', texto: 'Contenido sexual o violento' },
  { id: 'suplantacion', texto: 'Se hace pasar por otra persona' },
  { id: 'otro', texto: 'Otro motivo' },
] as const;

export type MotivoDenuncia = (typeof MOTIVOS_DENUNCIA)[number]['id'];

export type ObjetoDenuncia = {
  tipo: TipoDenuncia;
  /** uid de la persona denunciada; en un grupo, el id del chat */
  contra: string;
  /** Qué se denuncia: uid, `chatId/msgId` o chatId */
  ref: string;
  /** Copia del mensaje denunciado, por si luego lo borra quien lo escribió */
  extracto?: string;
};

export const MAX_DETALLE_DENUNCIA = 500;

export async function denunciar(
  objeto: ObjetoDenuncia,
  motivo: MotivoDenuncia,
  detalle?: string,
): Promise<void> {
  const limpio = detalle?.trim().slice(0, MAX_DETALLE_DENUNCIA);
  await addDoc(collection(dbOrThrow(), 'denuncias'), {
    de: uidOrThrow(),
    contra: objeto.contra,
    tipo: objeto.tipo,
    ref: objeto.ref,
    motivo,
    ...(limpio ? { detalle: limpio } : {}),
    ...(objeto.extracto ? { extracto: objeto.extracto.slice(0, MAX_DETALLE_DENUNCIA) } : {}),
    fecha: Date.now(),
  });
}
