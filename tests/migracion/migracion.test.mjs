/**
 * Test de la migración a 3.0 contra el emulador de Firestore.
 * Siembra datos con el formato antiguo y comprueba: copia de seguridad, simulación sin escrituras,
 * migración por partes, que no se borra nada, el registro de escrituras y la idempotencia.
 *
 * Ejecutar: npm run test:migracion
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { before, test } from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { codigoAmigo, copiaDeSeguridad, migrar } from '../../scripts/migracion-3.0.mjs';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
initializeApp({ projectId: 'demo-veoveo' });
const db = getFirestore();
const carpeta = mkdtempSync(path.join(tmpdir(), 'veoveo-migracion-'));
const registro = path.join(carpeta, 'registro.jsonl');

before(async () => {
  const lote = db.batch();
  lote.set(db.doc('usuarios/ana'), {
    uid: 'ana', username: 'Ana', email: 'ana@ejemplo.com', pushToken: 'ExponentPushToken[ana]',
    bloqueados: ['pepe'], appVersion: '2.0.4', appVersionCode: 40, platform: 'android', amigos: ['luis'], fechaCreacion: 1,
  });
  lote.set(db.doc('usuarios/ana/peliculas/603'), { idPelicula: 603, estado: 'vista' });
  lote.set(db.doc('usuarios/luis'), { uid: 'luis', username: 'Luis', username_servido: 'luis', amigos: ['ana'] });
  lote.set(db.doc('solicitudes_amistad/aleatoria1'), { deUid: 'pepe', paraUid: 'ana', estado: 'pendiente', timestamp: 5 });
  lote.set(db.doc('solicitudes_amistad/aleatoria2'), { deUid: 'luis', paraUid: 'ana', estado: 'aceptada' });
  lote.set(db.doc('solicitudes_amistad/aleatoria3'), { deUid: 'eva', paraUid: 'ana', estado: 'rechazada' });
  lote.set(db.doc('chats/g'), { type: 'group', participants: ['ana', 'luis'], createdAt: 1 });
  lote.set(db.doc('chats/i'), { type: 'individual', participants: ['luis', 'ana'], createdAt: 1 });
  lote.set(db.doc('matches/viejo'), { participants: ['ana', 'luis'], status: 'active', votes: {}, noVotes: {}, matchedMovies: [603] });
  await lote.commit();
});

test('la copia de seguridad vuelca las colecciones y las subcolecciones', async () => {
  const { archivo, documentosRaiz } = await copiaDeSeguridad(db, carpeta);
  const copia = JSON.parse(readFileSync(archivo, 'utf8'));
  assert.equal(documentosRaiz, 8);
  const ana = copia.colecciones.usuarios.find((u) => u.id === 'ana');
  assert.equal(ana.datos.email, 'ana@ejemplo.com');
  assert.equal(ana.subcolecciones.peliculas[0].id, '603');
});

test('simular no escribe y cuenta lo que haría', async () => {
  const r = await migrar(db, FieldValue, { ejecutar: false });
  assert.equal(r.perfiles, 2);
  assert.equal(r.perfilesConDatosPrivados, 1);
  assert.equal(r.solicitudesCopiadas, 2);
  assert.equal(r.solicitudesAceptadasSinTocar, 1);
  assert.equal(r.chats, 2);
  assert.equal(r.matchesCancelados, 1);
  assert.equal((await db.doc('usuarios/ana').get()).data().email, 'ana@ejemplo.com');
});

test('por partes: solo usuarios', async () => {
  await migrar(db, FieldValue, { ejecutar: true, partes: ['usuarios'], registro });
  const ana = (await db.doc('usuarios/ana').get()).data();
  for (const c of ['email', 'pushToken', 'bloqueados', 'appVersion', 'appVersionCode', 'platform']) {
    assert.equal(ana[c], undefined, `${c} sigue en el perfil público`);
  }
  assert.deepEqual(ana.privacidad, { biblioteca: 'amigos', vistasEnSocial: true, vistasEnMatch: true, solicitudes: 'todos' });
  assert.equal(ana.codigoAmigo, codigoAmigo('ana'));
  assert.equal(ana.username_servido, 'ana');
  assert.equal((await db.doc('usuarios/ana/privado/cuenta').get()).data().email, 'ana@ejemplo.com');
  assert.equal((await db.doc('usuarios/ana/privado/avisos').get()).data().pushToken, 'ExponentPushToken[ana]');
  // Las demás partes siguen sin tocar
  assert.equal((await db.doc('solicitudes_amistad/aleatoria1').get()).data().estado, 'pendiente');
});

test('el resto: no se borra ninguna solicitud; se copian y se marcan', async () => {
  await migrar(db, FieldValue, { ejecutar: true, partes: ['solicitudes', 'chats', 'matches'], registro });
  assert.equal((await db.doc('solicitudes_amistad/pepe_ana').get()).data().estado, 'pendiente');
  assert.equal((await db.doc('solicitudes_amistad/eva_ana').get()).data().estado, 'rechazada');
  const original = (await db.doc('solicitudes_amistad/aleatoria1').get()).data();
  assert.equal(original.estado, 'migrada');
  assert.equal(original.migradaA, 'pepe_ana');
  assert.equal((await db.doc('solicitudes_amistad/aleatoria2').get()).data().estado, 'aceptada');
  assert.equal((await db.collection('solicitudes_amistad').get()).size, 5);

  assert.deepEqual((await db.doc('chats/g').get()).data().admins, ['ana']);
  assert.equal((await db.doc('chats/g').get()).data().emoji, '🍿');
  const m = (await db.doc('matches/viejo').get()).data();
  assert.equal(m.estado, 'cancelled');
  assert.deepEqual(m.coincidencias, [603]);
});

test('el registro apunta cada escritura con su antes', async () => {
  const lineas = readFileSync(registro, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(lineas.length > 0);
  const perfilAna = lineas.find((l) => l.ruta === 'usuarios/ana' && l.op === 'update');
  assert.equal(perfilAna.antes.email, 'ana@ejemplo.com');
  const marcada = lineas.find((l) => l.ruta === 'solicitudes_amistad/aleatoria1');
  assert.equal(marcada.antes.estado, 'pendiente');
});

test('repetirla no cambia nada (idempotente)', async () => {
  const r = await migrar(db, FieldValue, { ejecutar: true });
  assert.equal(r.perfilesConDatosPrivados, 0);
  assert.equal(r.solicitudesCopiadas, 0);
  assert.equal(r.chats, 0);
  assert.equal(r.matchesCancelados, 0);
});
