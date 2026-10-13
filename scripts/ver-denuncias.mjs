/**
 * Lista las denuncias de VeoVeo (solo LECTURA, Admin SDK). La app solo puede crearlas; nadie
 * las lee desde la app. Lo usa Álvaro para revisarlas y decidir (avisar, borrar contenido o la
 * cuenta desde la consola).
 * La salida tiene datos personales: se mira en la terminal, no se pega en chats ni se sube.
 *
 *   node scripts/ver-denuncias.mjs          (las 50 últimas)
 *   node scripts/ver-denuncias.mjs 200
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clave = JSON.parse(
  readFileSync(path.join(raiz, 'veoveo-48667-firebase-adminsdk-fbsvc-78adfe1091.json'), 'utf8'),
);
initializeApp({ credential: cert(clave) });
const db = getFirestore();

const cuantas = Number(process.argv[2]) || 50;
const snap = await db.collection('denuncias').orderBy('fecha', 'desc').limit(cuantas).get();
if (snap.empty) {
  console.log('No hay denuncias.');
  process.exit(0);
}

const nombres = new Map();
const nombre = async (uid) => {
  if (!nombres.has(uid)) {
    const p = await db.doc(`usuarios/${uid}`).get();
    nombres.set(uid, p.exists ? (p.get('username') ?? uid) : `${uid} (sin perfil)`);
  }
  return nombres.get(uid);
};

for (const d of snap.docs) {
  const x = d.data();
  const contra = x.tipo === 'chat' ? `grupo ${x.contra}` : await nombre(x.contra);
  console.log(
    [
      `── ${new Date(x.fecha).toLocaleString('es-ES')} · ${x.tipo} · ${x.motivo} · ${d.id}`,
      `   de: ${await nombre(x.de)}  →  contra: ${contra}`,
      `   ref: ${x.ref}`,
      x.extracto ? `   mensaje: ${x.extracto}` : null,
      x.detalle ? `   detalle: ${x.detalle}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );
}
console.log(`\n${snap.size} denuncia(s).`);
