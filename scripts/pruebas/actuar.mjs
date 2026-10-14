/**
 * Hace de Beto o de Manoli en el entorno de PRUEBAS, para probar con un solo móvil lo que
 * necesita dos cuentas: escribe en un chat como lo haría la app (mensaje, resumen del chat,
 * leído y aviso push a los demás, respetando silenciados y preferencias).
 * Solo funciona contra `veoveo-pruebas`.
 *
 *   node scripts/pruebas/actuar.mjs mensaje beto "¿Vemos algo hoy?"   (chat Alvaro–Beto)
 *   node scripts/pruebas/actuar.mjs grupo manoli "¡Me apunto!"          (grupo «Cine del finde»)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const PROYECTO = 'veoveo-pruebas';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const entorno = dotenv.parse(readFileSync(path.join(raiz, '.env.pruebas.local')));
if (entorno.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== PROYECTO)
  throw new Error(`Solo contra ${PROYECTO}.`);

const [accion, quien, ...resto] = process.argv.slice(2);
const texto = resto.join(' ').trim();
const NOMBRES = { beto: 'Beto', manoli: 'Manoli' };
if (!['mensaje', 'grupo'].includes(accion) || !NOMBRES[quien] || !texto) {
  console.log('Uso: node scripts/pruebas/actuar.mjs <mensaje|grupo> <beto|manoli> "texto"');
  process.exit(1);
}
if (accion === 'mensaje' && quien !== 'beto') {
  console.log('El chat individual de ejemplo es Alvaro–Beto: usa «beto».');
  process.exit(1);
}

const claves = Object.fromEntries(
  readFileSync(path.resolve(raiz, '..', '..', '_copias', 'veoveo', 'cuentas-pruebas.txt'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('@'))
    .map((l) => l.split(' ')),
);
const email = `${quien}@veoveo-pruebas.test`;
const app = initializeApp({
  apiKey: entorno.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: entorno.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: entorno.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: entorno.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const yo = (await signInWithEmailAndPassword(getAuth(app), email, claves[email])).user.uid;
const db = getFirestore(app);

// El chat: el individual con Alvaro o el grupo
const tipo = accion === 'mensaje' ? 'individual' : 'group';
const chats = await getDocs(
  query(
    collection(db, 'chats'),
    where('participants', 'array-contains', yo),
    where('type', '==', tipo),
  ),
);
const chatDoc = chats.docs[0];
if (!chatDoc) throw new Error('No encuentro el chat. ¿Has lanzado preparar.mjs?');
const chat = { id: chatDoc.id, ...chatDoc.data() };

// Como enviarMensaje de la app
const ahora = Date.now();
await addDoc(collection(db, 'chats', chat.id, 'msj'), {
  senderId: yo,
  type: 'text',
  text: texto.slice(0, 2000),
  timestamp: ahora,
  eliminado: false,
});
await updateDoc(doc(db, 'chats', chat.id), {
  lastMessage: { text: texto.slice(0, 140), senderId: yo, timestamp: ahora, tipo: 'text' },
});
await setDoc(doc(db, 'chats', chat.id, 'miembros', yo), { ultimaLectura: ahora }, { merge: true });
await setDoc(
  doc(db, 'usuarios', yo, 'privado', 'chats'),
  { [chat.id]: { ultimaLectura: ahora } },
  { merge: true },
);

// Avisos (como avisarParticipantes + notificarAUsuario)
const miembros = await getDocs(collection(db, 'chats', chat.id, 'miembros'));
const silenciados = new Set(miembros.docs.filter((d) => d.data().silenciado).map((d) => d.id));
const nombre = NOMBRES[quien];
const titulo = chat.type === 'group' ? `${chat.emoji ?? '🍿'} ${chat.name ?? 'Grupo'}` : nombre;
const cuerpo = (chat.type === 'group' ? `${nombre}: ${texto}` : texto).slice(0, 160);
let avisados = 0;
for (const uid of chat.participants.filter((u) => u !== yo && !silenciados.has(u))) {
  const avisos = await getDoc(doc(db, 'usuarios', uid, 'privado', 'avisos')).catch(() => null);
  const a = avisos?.data();
  if (!a?.pushToken || a.notificaciones?.mensajes === false) continue;
  const r = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: a.pushToken,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      title: titulo,
      body: cuerpo,
      data: { chatId: chat.id, type: 'message', url: `veoveo://chat/${chat.id}` },
    }),
  });
  if (r.ok) avisados++;
}
console.log(
  `${nombre} ha escrito en ${chat.type === 'group' ? `«${chat.name}»` : 'el chat con Alvaro'}. Avisos enviados: ${avisados}.`,
);
process.exit(0);
