/**
 * Prepara el entorno de PRUEBAS (Firebase `veoveo-pruebas`): inicio de sesión con correo,
 * tres cuentas con el correo verificado y datos de ejemplo (bibliotecas, amistades, chats y un
 * Movie Match a medias). Nunca toca producción: se niega a seguir si el proyecto no es
 * `veoveo-pruebas`.
 *
 * Los datos se escriben con el SDK de cliente, entrando como cada cuenta: pasan por las mismas
 * reglas que la app, así que también las comprueban.
 *
 * Requisitos: `firebase login` hecho (usa esa sesión para la API de Auth) y `.env.pruebas.local`
 * (configuración web de veoveo-pruebas). Las contraseñas se guardan FUERA del repo, en
 * `DripDev/_copias/veoveo/cuentas-pruebas.txt`.
 *
 *   node scripts/pruebas/preparar.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

const PROYECTO = 'veoveo-pruebas';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ── Configuración y salvaguardas ────────────────────────────────
const entorno = dotenv.parse(readFileSync(path.join(raiz, '.env.pruebas.local')));
const tmdb = dotenv.parse(readFileSync(path.join(raiz, '.env'))).EXPO_PUBLIC_TMDB_READ_TOKEN;
const config = {
  apiKey: entorno.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: entorno.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: entorno.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: entorno.EXPO_PUBLIC_FIREBASE_APP_ID,
};
if (config.projectId !== PROYECTO) {
  throw new Error(`.env.pruebas.local apunta a «${config.projectId}», no a ${PROYECTO}. No sigo.`);
}

const carpeta = path.resolve(raiz, '..', '..', '_copias', 'veoveo');
const archivoClaves = path.join(carpeta, 'cuentas-pruebas.txt');
if (archivoClaves.startsWith(raiz + path.sep))
  throw new Error('Las contraseñas van fuera del repo.');

const CUENTAS = [
  {
    clave: 'ana',
    email: 'ana@veoveo-pruebas.test',
    nombre: 'Ana',
    bio: 'Ciencia ficción y palomitas.',
  },
  {
    clave: 'beto',
    email: 'beto@veoveo-pruebas.test',
    nombre: 'Beto',
    bio: 'Si tiene naves, la veo.',
  },
  {
    clave: 'carla',
    email: 'carla@veoveo-pruebas.test',
    nombre: 'Carla',
    bio: 'Animación por encima de todo.',
  },
];

// ── API de Auth (administración) con la sesión de `firebase login` ──
const ft = createRequire(
  path.join(process.env.APPDATA ?? '', 'npm', 'node_modules', 'firebase-tools', 'lib', 'x.js'),
);
async function tokenDeAcceso() {
  const auth = ft('./auth.js');
  const cuenta = auth.getGlobalDefaultAccount();
  if (!cuenta) throw new Error('Haz antes `firebase login`.');
  const t = await auth.getAccessToken(cuenta.tokens.refresh_token, [
    'https://www.googleapis.com/auth/cloud-platform',
  ]);
  return t.access_token;
}

async function idt(token, metodo, ruta, cuerpo) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': PROYECTO,
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${metodo} ${ruta}: ${r.status} ${json?.error?.message ?? ''}`);
  return json;
}

function cargarClaves() {
  const claves = {};
  if (existsSync(archivoClaves)) {
    for (const linea of readFileSync(archivoClaves, 'utf8').split(/\r?\n/)) {
      const [email, clave] = linea.split(' ');
      if (email?.includes('@') && clave) claves[email] = clave;
    }
  }
  return claves;
}

async function prepararAuth() {
  const token = await tokenDeAcceso();
  // Lo que hace «Comenzar» en la consola de Authentication (sin facturación: plan Spark)
  await idt(token, 'POST', `v2/projects/${PROYECTO}/identityPlatform:initializeAuth`, {}).catch(
    (e) => {
      if (!/ALREADY|exists/i.test(String(e))) throw e;
    },
  );
  await idt(
    token,
    'PATCH',
    `admin/v2/projects/${PROYECTO}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,
    { signIn: { email: { enabled: true, passwordRequired: true } } },
  );
  console.log('Auth: inicio de sesión con correo y contraseña activado.');

  const claves = cargarClaves();
  const uids = {};
  for (const c of CUENTAS) {
    claves[c.email] ??= `VeoVeo-${randomBytes(6).toString('base64url')}`;
    const existe = await idt(token, 'POST', `v1/projects/${PROYECTO}/accounts:lookup`, {
      email: [c.email],
    });
    if (existe.users?.length) {
      uids[c.clave] = existe.users[0].localId;
      await idt(token, 'POST', `v1/projects/${PROYECTO}/accounts:update`, {
        localId: uids[c.clave],
        password: claves[c.email],
        emailVerified: true,
      });
      console.log(`${c.email}: ya existía; contraseña y verificación al día.`);
    } else {
      const nueva = await idt(token, 'POST', `v1/projects/${PROYECTO}/accounts`, {
        email: c.email,
        password: claves[c.email],
        emailVerified: true,
        displayName: c.nombre,
      });
      uids[c.clave] = nueva.localId;
      console.log(`${c.email}: creada.`);
    }
  }
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(
    archivoClaves,
    [
      `# Cuentas del entorno de PRUEBAS (${PROYECTO}). No son de producción.`,
      ...CUENTAS.map((c) => `${c.email} ${claves[c.email]}`),
      '',
    ].join('\n'),
  );
  console.log(`Contraseñas en ${archivoClaves}`);
  return { uids, claves };
}

// ── Películas de ejemplo (TMDB, en español) ─────────────────────
const IDS = [
  27205, 157336, 155, 680, 603, 496243, 129, 872585, 693134, 1022789, 945961, 77338, 194, 120, 122,
  11, 105, 299534, 438631, 1124, 4935, 354912, 862, 508442, 346698, 278, 238, 13, 550, 424, 569094,
];
async function cargarPelis() {
  const pelis = {};
  for (const id of IDS) {
    const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=es-ES`, {
      headers: { Authorization: `Bearer ${tmdb}` },
    });
    if (!r.ok) throw new Error(`TMDB ${id}: ${r.status}`);
    const p = await r.json();
    pelis[id] = { id, titulo: p.title, poster: p.poster_path ?? null, fecha: p.release_date ?? '' };
  }
  return pelis;
}

const DIA = 24 * 60 * 60 * 1000;
const ahora = Date.now();

// Vistas [id, estrellas, hace cuántos días] y Por ver [id]
const BIBLIOTECAS = {
  ana: {
    vistas: [
      [27205, 5, 2],
      [157336, 5, 9],
      [155, 4, 15],
      [680, 4, 30],
      [603, 5, 45],
      [496243, 4, 60],
      [129, 5, 80],
      [872585, 4, 100],
    ],
    porVer: [693134, 1022789, 945961, 77338, 194],
  },
  beto: {
    vistas: [
      [157336, 4, 1],
      [603, 4, 6],
      [120, 5, 20],
      [122, 5, 21],
      [11, 5, 40],
      [105, 5, 55],
      [299534, 3, 70],
      [438631, 4, 90],
    ],
    porVer: [693134, 872585, 496243, 1124, 129],
  },
  carla: {
    vistas: [
      [129, 5, 3],
      [4935, 5, 8],
      [354912, 4, 12],
      [862, 5, 25],
      [508442, 4, 35],
      [194, 5, 50],
      [77338, 4, 65],
      [346698, 3, 85],
    ],
    porVer: [693134, 1022789, 1124, 27205, 278],
  },
};

const MAZO_IDS = [
  693134, 1124, 278, 1022789, 238, 13, 194, 550, 569094, 424, 945961, 77338, 496243, 872585, 120,
  4935, 105, 11, 155, 862,
];
// Beto y Carla ya han votado: si Ana dice «sí» a 693134, 1124 y 278, el Match llega a 3.
const VOTOS = {
  beto: { si: [693134, 1124, 278, 238, 13, 569094], no: [550, 424] },
  carla: { si: [693134, 1022789, 1124, 278, 194], no: [238, 13] },
};

// ── Datos con el SDK de cliente, como cada cuenta ───────────────
async function entrar(c, clave) {
  const app = initializeApp(config, c.clave);
  const cred = await signInWithEmailAndPassword(getAuth(app), c.email, clave);
  return { db: getFirestore(app), uid: cred.user.uid, ...c };
}

async function sembrar(claves, pelis) {
  const [ana, beto, carla] = await Promise.all(CUENTAS.map((c) => entrar(c, claves[c.email])));
  if ((await getDoc(doc(ana.db, 'usuarios', ana.uid))).exists()) {
    console.log('Ya hay datos de ejemplo (existe el perfil de Ana). No se repiten.');
    return;
  }
  const codigo = (i) => ['ANA234', 'BET234', 'CAR234'][i];

  // Perfiles (como asegurarPerfilFirestore) y datos privados
  for (const [i, u] of [ana, beto, carla].entries()) {
    const lote = writeBatch(u.db);
    lote.set(doc(u.db, 'usuarios', u.uid), {
      uid: u.uid,
      username: u.nombre,
      username_servido: u.nombre.toLowerCase(),
      codigoAmigo: codigo(i),
      fotoPerfil: null,
      bio: u.bio,
      amigos: [],
      fechaCreacion: ahora - 120 * DIA,
      privacidad: {
        biblioteca: 'amigos',
        vistasEnSocial: true,
        vistasEnMatch: true,
        solicitudes: 'todos',
      },
    });
    lote.set(doc(u.db, 'usuarios', u.uid, 'privado', 'cuenta'), { email: u.email, bloqueados: [] });
    await lote.commit();

    // Biblioteca
    const bib = BIBLIOTECAS[u.clave];
    const libro = writeBatch(u.db);
    for (const [id, estrellas, hace] of bib.vistas) {
      const p = pelis[id];
      libro.set(doc(u.db, 'usuarios', u.uid, 'peliculas', String(id)), {
        idPelicula: id,
        titulo: p.titulo,
        rutaPoster: p.poster,
        fechaLanzamiento: p.fecha,
        estado: 'vista',
        valoracion: estrellas,
        fechaAnadido: ahora - (hace + 3) * DIA,
        fechaVisto: ahora - hace * DIA,
      });
    }
    for (const [n, id] of bib.porVer.entries()) {
      const p = pelis[id];
      libro.set(doc(u.db, 'usuarios', u.uid, 'peliculas', String(id)), {
        idPelicula: id,
        titulo: p.titulo,
        rutaPoster: p.poster,
        fechaLanzamiento: p.fecha,
        estado: 'por_ver',
        valoracion: 0,
        fechaAnadido: ahora - (n + 1) * 4 * DIA,
      });
    }
    await libro.commit();
  }
  console.log('Perfiles y bibliotecas: hecho.');

  // Amistades (como enviarSolicitudAmistad + aceptarSolicitud): Ana con Beto y con Carla
  const hacerAmigos = async (de, para) => {
    await setDoc(doc(de.db, 'solicitudes_amistad', `${de.uid}_${para.uid}`), {
      deUid: de.uid,
      deUsername: de.nombre,
      paraUid: para.uid,
      estado: 'pendiente',
      fecha: ahora - 100 * DIA,
    });
    const lote = writeBatch(para.db);
    lote.update(doc(para.db, 'usuarios', de.uid), { amigos: arrayUnion(para.uid) });
    lote.update(doc(para.db, 'usuarios', para.uid), { amigos: arrayUnion(de.uid) });
    lote.delete(doc(para.db, 'solicitudes_amistad', `${de.uid}_${para.uid}`));
    await lote.commit();
  };
  await hacerAmigos(ana, beto);
  await hacerAmigos(ana, carla);
  // Carla le ha pedido amistad a Beto y él aún no ha contestado (pantalla de Solicitudes)
  await setDoc(doc(carla.db, 'solicitudes_amistad', `${carla.uid}_${beto.uid}`), {
    deUid: carla.uid,
    deUsername: carla.nombre,
    paraUid: beto.uid,
    estado: 'pendiente',
    fecha: ahora - 1 * DIA,
  });
  console.log('Amistades: Ana–Beto y Ana–Carla; solicitud pendiente de Carla a Beto.');

  // Mensajes (como enviarMensaje + marcarLeido)
  const escribir = async (u, chatId, mensaje, momento) => {
    await addDoc(collection(u.db, 'chats', chatId, 'msj'), {
      senderId: u.uid,
      type: mensaje.type ?? 'text',
      text: mensaje.text,
      timestamp: momento,
      eliminado: false,
      ...(mensaje.movieData ? { movieData: mensaje.movieData } : {}),
      ...(mensaje.matchId ? { matchId: mensaje.matchId } : {}),
    });
    const resumen =
      mensaje.type === 'movie'
        ? `🎬 ${mensaje.movieData.title}`
        : mensaje.type === 'match_invite'
          ? '🍿 Movie Match'
          : mensaje.text;
    await updateDoc(doc(u.db, 'chats', chatId), {
      lastMessage: {
        text: resumen.slice(0, 140),
        senderId: u.uid,
        timestamp: momento,
        tipo: mensaje.type ?? 'text',
      },
    });
    await setDoc(
      doc(u.db, 'usuarios', u.uid, 'privado', 'chats'),
      { [chatId]: { ultimaLectura: momento } },
      { merge: true },
    );
    await setDoc(
      doc(u.db, 'chats', chatId, 'miembros', u.uid),
      { ultimaLectura: momento },
      { merge: true },
    );
  };
  const peliMsg = (id) => ({ id, title: pelis[id].titulo, posterPath: pelis[id].poster });

  // Chat individual Ana–Beto
  const individual = await addDoc(collection(ana.db, 'chats'), {
    type: 'individual',
    participants: [ana.uid, beto.uid],
    admins: [ana.uid],
    createdBy: ana.uid,
    createdAt: ahora - 5 * DIA,
    lastMessage: null,
    activeMatchId: null,
  });
  await escribir(
    ana,
    individual.id,
    { text: '¿Has visto ya Interstellar otra vez?' },
    ahora - 5 * DIA,
  );
  await escribir(
    beto,
    individual.id,
    { text: 'Ayer. Sigue siendo una pasada.' },
    ahora - 5 * DIA + 3600e3,
  );
  await escribir(
    ana,
    individual.id,
    { type: 'movie', text: pelis[693134].titulo, movieData: peliMsg(693134) },
    ahora - 2 * DIA,
  );
  await escribir(
    beto,
    individual.id,
    { text: 'Esa la tengo pendiente, ¡vamos!' },
    ahora - 2 * DIA + 600e3,
  );

  // Grupo «Cine del finde» (Ana administra; Beto y Carla son amigos suyos)
  const grupo = await addDoc(collection(ana.db, 'chats'), {
    type: 'group',
    participants: [ana.uid, beto.uid, carla.uid],
    admins: [ana.uid],
    createdBy: ana.uid,
    createdAt: ahora - 3 * DIA,
    name: 'Cine del finde',
    emoji: '🍿',
    lastMessage: null,
    activeMatchId: null,
  });
  await escribir(
    ana,
    grupo.id,
    { type: 'sistema', text: 'Ana ha creado el grupo' },
    ahora - 3 * DIA,
  );
  await escribir(carla, grupo.id, { text: '¿Qué vemos el sábado?' }, ahora - 3 * DIA + 1800e3);
  await escribir(
    beto,
    grupo.id,
    { text: 'Lo que salga del Match, como siempre 😄' },
    ahora - 3 * DIA + 3600e3,
  );

  // Movie Match del grupo, a medias (como crearMatch con chat)
  const mazo = MAZO_IDS.map((id) => {
    const p = pelis[id];
    const pv = [ana, beto, carla]
      .filter((u) => BIBLIOTECAS[u.clave].porVer.includes(id))
      .map((u) => u.uid);
    const v = [ana, beto, carla]
      .filter((u) => BIBLIOTECAS[u.clave].vistas.some(([x]) => x === id))
      .map((u) => u.uid);
    return {
      id,
      t: p.titulo,
      p: p.poster,
      ...(p.fecha ? { a: p.fecha.slice(0, 4) } : {}),
      ...(pv.length ? { pv } : {}),
      ...(v.length ? { v } : {}),
      ...(pv.length === 0 && v.length === 0 ? { r: 1 } : {}),
    };
  });
  const match = await addDoc(collection(ana.db, 'matches'), {
    chatId: grupo.id,
    creatorId: ana.uid,
    participants: [ana.uid, beto.uid, carla.uid],
    objetivo: 3,
    estado: 'active',
    mazo,
    coincidencias: [],
    createdAt: ahora - 1 * DIA,
  });
  await updateDoc(doc(ana.db, 'chats', grupo.id), { activeMatchId: match.id });
  await escribir(
    ana,
    grupo.id,
    { type: 'match_invite', text: 'Movie Match: buscamos 3 pelis en común', matchId: match.id },
    ahora - 1 * DIA,
  );
  for (const u of [beto, carla]) {
    await setDoc(doc(u.db, 'matches', match.id, 'votos', u.uid), {
      ...VOTOS[u.clave],
      actualizadoEn: ahora - 20 * 3600e3,
    });
  }
  await escribir(carla, grupo.id, { text: 'Ya he votado. Te toca, Ana 👀' }, ahora - 20 * 3600e3);
  console.log('Chats: Ana–Beto y el grupo «Cine del finde» con un Movie Match a medias.');
}

const { claves } = await prepararAuth();
const pelis = await cargarPelis();
await sembrar(claves, pelis);
console.log(`\nEntorno ${PROYECTO} listo.`);
process.exit(0);
