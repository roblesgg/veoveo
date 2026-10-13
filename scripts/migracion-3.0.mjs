/**
 * Migración de datos a VeoVeo 3.0 (Fase D5).
 *
 *   node scripts/migracion-3.0.mjs                 → SIMULA en producción: solo cuenta, no escribe
 *   node scripts/migracion-3.0.mjs --ejecutar      → escribe en producción (🛑 solo con el OK de Álvaro)
 *   node scripts/migracion-3.0.mjs --emulador ...  → contra el emulador de Firestore (localhost:8080)
 *
 * Qué hace (ver «Plan de la Fase D» en docs/encargos/2026-10-13-veoveo-3.md):
 *  1. Perfiles: email, bloqueados, appVersion, appVersionCode y platform → privado/cuenta;
 *     pushToken → privado/avisos; se borran del perfil público. Añade privacidad por defecto
 *     y un código de amigo, y asegura username_servido en minúsculas.
 *  2. Solicitudes pendientes → id {de}_{para}. Las aceptadas y rechazadas se borran.
 *  3. Chats: admins = [primer participante] y emoji por defecto en los grupos.
 *  4. Matches con el esquema antiguo (mapas votes/noVotes) → estado «cancelled».
 * Es idempotente: se puede repetir sin estropear nada.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CAMPOS_PRIVADOS_CUENTA = ['email', 'bloqueados', 'appVersion', 'appVersionCode', 'platform'];
const PRIVACIDAD_POR_DEFECTO = { biblioteca: 'amigos', vistasEnSocial: true, vistasEnMatch: true, solicitudes: 'todos' };
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

/** Ejecuta (o simula) la migración. Devuelve los recuentos por paso. */
export async function migrar(db, FieldValue, { ejecutar }) {
  const cuenta = { perfiles: 0, perfilesConDatosPrivados: 0, solicitudesMovidas: 0, solicitudesBorradas: 0, chats: 0, matchesCancelados: 0 };
  let lote = db.batch();
  let enLote = 0;
  const escribir = async (fn) => {
    if (!ejecutar) return;
    fn(lote);
    enLote += 1;
    if (enLote >= 400) {
      await lote.commit();
      lote = db.batch();
      enLote = 0;
    }
  };

  // 1. Perfiles
  for (const doc of (await db.collection('usuarios').get()).docs) {
    const d = doc.data();
    cuenta.perfiles += 1;
    const privCuenta = {};
    for (const c of CAMPOS_PRIVADOS_CUENTA) if (d[c] !== undefined) privCuenta[c] = d[c];
    const tienePrivados = Object.keys(privCuenta).length > 0 || d.pushToken !== undefined;
    if (tienePrivados) cuenta.perfilesConDatosPrivados += 1;

    if (Object.keys(privCuenta).length > 0) {
      await escribir((b) => b.set(doc.ref.collection('privado').doc('cuenta'), privCuenta, { merge: true }));
    }
    if (d.pushToken !== undefined) {
      await escribir((b) => b.set(doc.ref.collection('privado').doc('avisos'), { pushToken: d.pushToken }, { merge: true }));
    }
    const cambios = {};
    for (const c of [...CAMPOS_PRIVADOS_CUENTA, 'pushToken']) if (d[c] !== undefined) cambios[c] = FieldValue.delete();
    if (!d.privacidad) cambios.privacidad = PRIVACIDAD_POR_DEFECTO;
    if (!d.codigoAmigo) cambios.codigoAmigo = codigoAmigo(doc.id);
    const servido = (d.username || '').toLowerCase();
    if (d.username && d.username_servido !== servido) cambios.username_servido = servido;
    if (!Array.isArray(d.amigos)) cambios.amigos = [];
    if (Object.keys(cambios).length > 0) await escribir((b) => b.update(doc.ref, cambios));
  }

  // 2. Solicitudes
  for (const doc of (await db.collection('solicitudes_amistad').get()).docs) {
    const s = doc.data();
    const idNuevo = `${s.deUid}_${s.paraUid}`;
    if (s.estado !== 'pendiente') {
      cuenta.solicitudesBorradas += 1;
      await escribir((b) => b.delete(doc.ref));
    } else if (doc.id !== idNuevo) {
      cuenta.solicitudesMovidas += 1;
      await escribir((b) => {
        b.set(db.collection('solicitudes_amistad').doc(idNuevo), {
          deUid: s.deUid,
          paraUid: s.paraUid,
          deUsername: s.deUsername ?? '',
          estado: 'pendiente',
          fecha: s.fecha ?? s.timestamp ?? Date.now(),
        });
        b.delete(doc.ref);
      });
    }
  }

  // 3. Chats
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
      await escribir((b) => b.update(doc.ref, cambios));
    }
  }

  // 4. Matches con el esquema antiguo
  for (const doc of (await db.collection('matches').get()).docs) {
    const m = doc.data();
    const antiguo = m.votes !== undefined || m.noVotes !== undefined || m.status !== undefined;
    if (antiguo && m.estado !== 'cancelled') {
      cuenta.matchesCancelados += 1;
      await escribir((b) => b.update(doc.ref, { estado: 'cancelled', coincidencias: m.matchedMovies ?? [] }));
    }
  }

  if (ejecutar && enLote > 0) await lote.commit();
  return cuenta;
}

// ── Uso desde la línea de comandos ─────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  const ejecutar = args.has('--ejecutar');
  const emulador = args.has('--emulador');
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

  if (emulador) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    initializeApp({ projectId: 'demo-veoveo' });
  } else {
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const clave = JSON.parse(readFileSync(path.join(raiz, 'veoveo-48667-firebase-adminsdk-fbsvc-78adfe1091.json'), 'utf8'));
    initializeApp({ credential: cert(clave) });
  }

  const destino = emulador ? 'EMULADOR' : 'PRODUCCIÓN (veoveo-48667)';
  console.log(`${ejecutar ? 'EJECUTANDO' : 'SIMULANDO (no escribe)'} en ${destino}…`);
  const recuento = await migrar(getFirestore(), FieldValue, { ejecutar });
  console.log(JSON.stringify(recuento, null, 2));
  process.exit(0);
}
