/**
 * Cuentas de prueba en PRODUCCIÓN (veoveo-48667). OK de Álvaro del 14-10-2026 en el chat del agente.
 *
 *   node scripts/cuentas-prueba-produccion.mjs ver        (solo lectura: qué tiene cada cuenta)
 *   node scripts/cuentas-prueba-produccion.mjs aplicar    (borra prueba1 y prueba2; prepara prueba3)
 *
 * prueba3 es la cuenta para los revisores de Google Play y NO se borra: se le deja un perfil y una
 * biblioteca de ejemplo (sin amigos ni chats, que exigirían otra cuenta real).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clave = JSON.parse(
  readFileSync(path.join(raiz, 'veoveo-48667-firebase-adminsdk-fbsvc-78adfe1091.json'), 'utf8'),
);
if (clave.project_id !== 'veoveo-48667') throw new Error('No es la clave de producción esperada.');
initializeApp({ credential: cert(clave) });
const auth = getAuth();
const db = getFirestore();

const BORRAR = ['veoveo.prueba1@dripdev.dev', 'veoveo.prueba2@dripdev.dev'];
const REVISION = 'veoveo.prueba3@dripdev.dev';
const modo = process.argv[2];

async function resumen(email) {
  const u = await auth.getUserByEmail(email).catch(() => null);
  if (!u) return { email, existe: false };
  const perfil = await db.doc(`usuarios/${u.uid}`).get();
  const subs = await db.doc(`usuarios/${u.uid}`).listCollections();
  const [de, para] = await Promise.all([
    db.collection('solicitudes_amistad').where('deUid', '==', u.uid).get(),
    db.collection('solicitudes_amistad').where('paraUid', '==', u.uid).get(),
  ]);
  const chats = await db.collection('chats').where('participants', 'array-contains', u.uid).get();
  return {
    email,
    uid: u.uid,
    perfil: perfil.exists,
    amigos: perfil.get('amigos')?.length ?? 0,
    subcolecciones: subs.map((s) => s.id),
    solicitudes: de.size + para.size,
    chats: chats.size,
  };
}

if (modo === 'ver') {
  for (const e of [...BORRAR, REVISION]) console.log(await resumen(e));
  process.exit(0);
}
if (modo !== 'aplicar') {
  console.log('Uso: node scripts/cuentas-prueba-produccion.mjs <ver|aplicar>');
  process.exit(1);
}

// 1. Borrar prueba1 y prueba2 (solo si no tienen amigos ni chats: entonces no tocan a nadie)
for (const email of BORRAR) {
  const r = await resumen(email);
  if (!r.existe && r.existe !== undefined) {
    console.log(`${email}: no existe.`);
    continue;
  }
  if (r.amigos > 0 || r.chats > 0 || r.solicitudes > 0) {
    throw new Error(`${email} tiene amigos, chats o solicitudes: no la borro sin revisarlo.`);
  }
  await db.recursiveDelete(db.doc(`usuarios/${r.uid}`));
  await auth.deleteUser(r.uid);
  console.log(`${email}: borrada (Auth y datos).`);
}

// 2. prueba3: perfil y biblioteca de ejemplo para el revisor
const rev = await auth.getUserByEmail(REVISION);
const tmdb = dotenv.parse(readFileSync(path.join(raiz, '.env'))).EXPO_PUBLIC_TMDB_READ_TOKEN;
const peli = async (id) => {
  const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=es-ES`, {
    headers: { Authorization: `Bearer ${tmdb}` },
  });
  if (!r.ok) throw new Error(`TMDB ${id}: ${r.status}`);
  const p = await r.json();
  return { titulo: p.title, poster: p.poster_path ?? null, fecha: p.release_date ?? '' };
};
const DIA = 24 * 60 * 60 * 1000;
const ahora = Date.now();
const VISTAS = [
  [157336, 5, 3],
  [27205, 5, 10],
  [129, 5, 18],
  [603, 4, 30],
  [13, 4, 45],
  [354912, 4, 60],
];
const POR_VER = [693134, 1022789, 872585, 496243];

const refPerfil = db.doc(`usuarios/${rev.uid}`);
if (!(await refPerfil.get()).exists) {
  let codigo;
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 5 && !codigo; i++) {
    const c = Array.from(
      { length: 6 },
      () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)],
    ).join('');
    if ((await db.collection('usuarios').where('codigoAmigo', '==', c).limit(1).get()).empty)
      codigo = c;
  }
  await refPerfil.set({
    uid: rev.uid,
    username: 'Revisor VeoVeo',
    username_servido: 'revisor veoveo',
    codigoAmigo: codigo,
    fotoPerfil: null,
    bio: 'Cuenta de demostración.',
    amigos: [],
    fechaCreacion: ahora,
    privacidad: {
      biblioteca: 'amigos',
      vistasEnSocial: true,
      vistasEnMatch: true,
      solicitudes: 'nadie',
    },
  });
  await db
    .doc(`usuarios/${rev.uid}/privado/cuenta`)
    .set({ email: REVISION, bloqueados: [] }, { merge: true });
  console.log(`${REVISION}: perfil creado.`);
} else {
  console.log(`${REVISION}: ya tenía perfil; no se toca.`);
}
const lote = db.batch();
for (const [id, estrellas, hace] of VISTAS) {
  const p = await peli(id);
  lote.set(db.doc(`usuarios/${rev.uid}/peliculas/${id}`), {
    idPelicula: id,
    titulo: p.titulo,
    rutaPoster: p.poster,
    fechaLanzamiento: p.fecha,
    estado: 'vista',
    valoracion: estrellas,
    fechaAnadido: ahora - (hace + 2) * DIA,
    fechaVisto: ahora - hace * DIA,
  });
}
for (const [n, id] of POR_VER.entries()) {
  const p = await peli(id);
  lote.set(db.doc(`usuarios/${rev.uid}/peliculas/${id}`), {
    idPelicula: id,
    titulo: p.titulo,
    rutaPoster: p.poster,
    fechaLanzamiento: p.fecha,
    estado: 'por_ver',
    valoracion: 0,
    fechaAnadido: ahora - (n + 1) * 3 * DIA,
  });
}
await lote.commit();
console.log(`${REVISION}: ${VISTAS.length} vistas y ${POR_VER.length} por ver.`);
process.exit(0);
