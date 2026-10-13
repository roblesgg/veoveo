/**
 * Migración de datos a VeoVeo 3.0 (Fase D5).
 *
 *   node scripts/migracion-3.0.mjs                     → SIMULA en producción: solo cuenta, no escribe
 *   node scripts/migracion-3.0.mjs --ejecutar          → escribe en producción (🛑 solo con el OK de Álvaro)
 *   ... --colecciones=usuarios,solicitudes             → solo esas partes (usuarios, solicitudes, chats, matches)
 *   ... --copia-en=<carpeta>                           → dónde dejar la copia y el registro (fuera del repo)
 *   ... --emulador                                     → contra el emulador de Firestore (localhost:8080)
 *
 * Antes de la primera escritura vuelca a JSON TODO lo que puede tocar (usuarios con sus
 * subcolecciones, solicitudes_amistad, chats y matches). Si el volcado falla, no escribe nada.
 * Cada escritura queda en un registro línea a línea (JSONL) con el antes y el después,
 * para poder deshacer con la copia.
 *
 * Qué hace (ver «Plan de la Fase D» en docs/encargos/2026-10-13-veoveo-3.md). NO BORRA DOCUMENTOS:
 *  1. usuarios: email, bloqueados, appVersion, appVersionCode y platform → privado/cuenta;
 *     pushToken → privado/avisos; se quitan esos campos del perfil público. Añade privacidad
 *     por defecto, código de amigo y username_servido en minúsculas.
 *  2. solicitudes: las pendientes y las rechazadas se copian al id {de}_{para} con su estado
 *     (las rechazadas siguen impidiendo que se reenvíe). El original se marca estado «migrada».
 *     Las aceptadas no se tocan: la amistad ya está en `amigos` de los dos perfiles.
 *  3. chats: admins = [primer participante], createdBy si falta y emoji 🍿 en los grupos.
 *  4. matches con el esquema antiguo (mapas votes/noVotes) → estado «cancelled».
 * Es idempotente: se puede repetir sin estropear nada.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CAMPOS_PRIVADOS_CUENTA = ['email', 'bloqueados', 'appVersion', 'appVersionCode', 'platform'];
const PRIVACIDAD_POR_DEFECTO = { biblioteca: 'amigos', vistasEnSocial: true, vistasEnMatch: true, solicitudes: 'todos' };
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PARTES = ['usuarios', 'solicitudes', 'chats', 'matches'];

/** Código de amigo de 6 caracteres, estable para cada uid (sin I, O, 0 ni 1). */
export function codigoAmigo(uid) {
  let h = 2166136261;
  for (const c of uid) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO[h % ALFABETO.length];
    h = Math.floor(h / ALFABETO.length) || Math.imul(h + i + 7, 2654435761) >>> 0;
  }
  return codigo;
}

// ── Copia de seguridad ───────────────────────────────────────────

/** Vuelca un documento y todas sus subcolecciones. */
async function volcarDocumento(ref) {
  const snap = await ref.get();
  const salida = { id: ref.id, ruta: ref.path, datos: snap.exists ? snap.data() : null, subcolecciones: {} };
  for (const sub of await ref.listCollections()) {
    salida.subcolecciones[sub.id] = await Promise.all((await sub.listDocuments()).map(volcarDocumento));
  }
  return salida;
}

/** Vuelca las colecciones que toca la migración a <carpeta>/copia.json. Lanza si algo falla. */
export async function copiaDeSeguridad(db, carpeta) {
  mkdirSync(carpeta, { recursive: true });
  const copia = { fecha: new Date().toISOString(), colecciones: {} };
  for (const nombre of ['usuarios', 'solicitudes_amistad', 'chats', 'matches']) {
    const refs = await db.collection(nombre).listDocuments();
    copia.colecciones[nombre] = await Promise.all(refs.map(volcarDocumento));
  }
  const archivo = path.join(carpeta, 'copia.json');
  writeFileSync(archivo, JSON.stringify(copia, null, 1));
  const total = Object.values(copia.colecciones).reduce((n, docs) => n + docs.length, 0);
  return { archivo, documentosRaiz: total };
}

// ── Migración ────────────────────────────────────────────────────

/**
 * Ejecuta (o simula) la migración de las partes indicadas. Devuelve los recuentos.
 * Si se pasa `registro` (ruta de un .jsonl), cada escritura se apunta con su antes y su después.
 */
export async function migrar(db, FieldValue, { ejecutar, partes = PARTES, registro = null }) {
  const cuenta = {
    perfiles: 0,
    perfilesConDatosPrivados: 0,
    solicitudesCopiadas: 0,
    solicitudesMarcadas: 0,
    solicitudesAceptadasSinTocar: 0,
    chats: 0,
    matchesCancelados: 0,
  };
  const apuntar = (op, ruta, antes, despues) => {
    if (registro) appendFileSync(registro, JSON.stringify({ t: new Date().toISOString(), op, ruta, antes, despues }) + '\n');
  };
  let lote = db.batch();
  let enLote = 0;
  const escribir = async (op, ref, datos, antes, opciones) => {
    if (!ejecutar) return;
    if (op === 'set') lote.set(ref, datos, opciones ?? {});
    else lote.update(ref, datos);
    apuntar(op, ref.path, antes ?? null, datos);
    enLote += 1;
    if (enLote >= 400) {
      await lote.commit();
      lote = db.batch();
      enLote = 0;
    }
  };

  // 1. Perfiles
  if (partes.includes('usuarios')) {
    for (const doc of (await db.collection('usuarios').get()).docs) {
      const d = doc.data();
      cuenta.perfiles += 1;
      const privCuenta = {};
      for (const c of CAMPOS_PRIVADOS_CUENTA) if (d[c] !== undefined) privCuenta[c] = d[c];
      if (Object.keys(privCuenta).length > 0 || d.pushToken !== undefined) cuenta.perfilesConDatosPrivados += 1;

      if (Object.keys(privCuenta).length > 0) {
        await escribir('set', doc.ref.collection('privado').doc('cuenta'), privCuenta, null, { merge: true });
      }
      if (d.pushToken !== undefined) {
        await escribir('set', doc.ref.collection('privado').doc('avisos'), { pushToken: d.pushToken }, null, { merge: true });
      }
      const cambios = {};
      const antes = {};
      for (const c of [...CAMPOS_PRIVADOS_CUENTA, 'pushToken']) {
        if (d[c] !== undefined) {
          cambios[c] = FieldValue.delete();
          antes[c] = d[c];
        }
      }
      if (!d.privacidad) cambios.privacidad = PRIVACIDAD_POR_DEFECTO;
      if (!d.codigoAmigo) cambios.codigoAmigo = codigoAmigo(doc.id);
      const servido = (d.username || '').toLowerCase();
      if (d.username && d.username_servido !== servido) {
        cambios.username_servido = servido;
        antes.username_servido = d.username_servido ?? null;
      }
      if (!Array.isArray(d.amigos)) cambios.amigos = [];
      if (Object.keys(cambios).length > 0) await escribir('update', doc.ref, cambios, antes);
    }
  }

  // 2. Solicitudes (no se borra ninguna)
  if (partes.includes('solicitudes')) {
    for (const doc of (await db.collection('solicitudes_amistad').get()).docs) {
      const s = doc.data();
      const idNuevo = `${s.deUid}_${s.paraUid}`;
      if (s.estado === 'aceptada') {
        cuenta.solicitudesAceptadasSinTocar += 1;
        continue;
      }
      if (s.estado !== 'pendiente' && s.estado !== 'rechazada') continue; // ya migrada u otro estado
      if (doc.id === idNuevo) continue;
      cuenta.solicitudesCopiadas += 1;
      cuenta.solicitudesMarcadas += 1;
      await escribir('set', db.collection('solicitudes_amistad').doc(idNuevo), {
        deUid: s.deUid,
        paraUid: s.paraUid,
        deUsername: s.deUsername ?? '',
        estado: s.estado,
        fecha: s.fecha ?? s.timestamp ?? Date.now(),
      });
      await escribir('update', doc.ref, { estado: 'migrada', migradaA: idNuevo }, { estado: s.estado });
    }
  }

  // 3. Chats
  if (partes.includes('chats')) {
    for (const doc of (await db.collection('chats').get()).docs) {
      const c = doc.data();
      const cambios = {};
      if (!Array.isArray(c.admins) && Array.isArray(c.participants) && c.participants.length > 0) {
        cambios.admins = [c.participants[0]];
      }
      if (!c.createdBy && Array.isArray(c.participants) && c.participants.length > 0) cambios.createdBy = c.participants[0];
      if (c.type === 'group' && !c.emoji) cambios.emoji = '🍿';
      if (Object.keys(cambios).length > 0) {
        cuenta.chats += 1;
        await escribir('update', doc.ref, cambios, {});
      }
    }
  }

  // 4. Matches con el esquema antiguo
  if (partes.includes('matches')) {
    for (const doc of (await db.collection('matches').get()).docs) {
      const m = doc.data();
      const antiguo = m.votes !== undefined || m.noVotes !== undefined || m.status !== undefined;
      if (antiguo && m.estado !== 'cancelled') {
        cuenta.matchesCancelados += 1;
        await escribir('update', doc.ref, { estado: 'cancelled', coincidencias: m.matchedMovies ?? [] }, { estado: m.estado ?? null });
      }
    }
  }

  if (ejecutar && enLote > 0) await lote.commit();
  return cuenta;
}

// ── Uso desde la línea de comandos ─────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const ejecutar = args.includes('--ejecutar');
  const emulador = args.includes('--emulador');
  const valor = (nombre) => args.find((a) => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=');
  const partes = valor('colecciones')?.split(',').map((p) => p.trim()) ?? PARTES;
  if (partes.some((p) => !PARTES.includes(p))) {
    console.error(`Partes válidas: ${PARTES.join(', ')}`);
    process.exit(1);
  }

  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sello = new Date().toISOString().replace(/[:.]/g, '-');
  const carpeta = path.resolve(valor('copia-en') ?? path.join(raiz, '..', '..', '_copias', 'veoveo', `migracion-3.0-${sello}`));
  if (carpeta.startsWith(raiz + path.sep)) {
    console.error('La copia tiene que quedar FUERA del repositorio.');
    process.exit(1);
  }

  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  if (emulador) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    initializeApp({ projectId: 'demo-veoveo' });
  } else {
    const clave = JSON.parse(readFileSync(path.join(raiz, 'veoveo-48667-firebase-adminsdk-fbsvc-78adfe1091.json'), 'utf8'));
    initializeApp({ credential: cert(clave) });
  }
  const db = getFirestore();
  const destino = emulador ? 'EMULADOR' : 'PRODUCCIÓN (veoveo-48667)';

  let registro = null;
  if (ejecutar) {
    console.log(`Copia de seguridad en ${carpeta}…`);
    try {
      const { archivo, documentosRaiz } = await copiaDeSeguridad(db, carpeta);
      console.log(`Copia hecha: ${archivo} (${documentosRaiz} documentos raíz con sus subcolecciones).`);
    } catch (e) {
      console.error('La copia de seguridad ha fallado. NO se escribe nada.', e);
      process.exit(1);
    }
    registro = path.join(carpeta, 'registro.jsonl');
  }

  console.log(`${ejecutar ? 'EJECUTANDO' : 'SIMULANDO (no escribe)'} en ${destino} · partes: ${partes.join(', ')}`);
  const recuento = await migrar(db, FieldValue, { ejecutar, partes, registro });
  console.log(JSON.stringify(recuento, null, 2));
  if (registro) console.log(`Registro de escrituras: ${registro}`);
  process.exit(0);
}
