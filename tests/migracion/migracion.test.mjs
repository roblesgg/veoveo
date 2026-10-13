/**
 * Test de la migración a 3.0 contra el emulador de Firestore.
 * Siembra datos con el formato antiguo, migra dos veces (idempotencia) y comprueba el resultado.
 *
 * Ejecutar: npm run test:migracion
 */
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { codigoAmigo, migrar } from '../../scripts/migracion-3.0.mjs';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
initializeApp({ projectId: 'demo-veoveo' });
const db = getFirestore();

before(async () => {
  const lote = db.batch();
  lote.set(db.doc('usuarios/ana'), {
    uid: 'ana', username: 'Ana', email: 'ana@ejemplo.com', pushToken: 'ExponentPushToken[ana]',
    bloqueados: ['pepe'], appVersion: '2.0.4', appVersionCode: 40, platform: 'android', amigos: ['luis'], fechaCreacion: 1,
  });
  lote.set(db.doc('usuarios/luis'), { uid: 'luis', username: 'Luis', username_servido: 'luis', amigos: ['ana'] });
  lote.set(db.doc('solicitudes_amistad/aleatoria1'), { deUid: 'pepe', paraUid: 'ana', estado: 'pendiente', timestamp: 5 });
  lote.set(db.doc('solicitudes_amistad/aleatoria2'), { deUid: 'luis', paraUid: 'ana', estado: 'aceptada' });
  lote.set(db.doc('chats/g'), { type: 'group', participants: ['ana', 'luis'], createdAt: 1 });
  lote.set(db.doc('chats/i'), { type: 'individual', participants: ['luis', 'ana'], createdAt: 1 });
  lote.set(db.doc('matches/viejo'), { participants: ['ana', 'luis'], status: 'active', votes: {}, noVotes: {}, matchedMovies: [603] });
  await lote.commit();
});

test('simular no escribe y cuenta lo que haría', async () => {
  const r = await migrar(db, FieldValue, { ejecutar: false });
  assert.equal(r.perfiles, 2);
  assert.equal(r.perfilesConDatosPrivados, 1);
  assert.equal(r.solicitudesMovidas, 1);
  assert.equal(r.solicitudesBorradas, 1);
  assert.equal(r.chats, 2);
  assert.equal(r.matchesCancelados, 1);
  assert.equal((await db.doc('usuarios/ana').get()).data().email, 'ana@ejemplo.com');
});

test('ejecutar mueve los datos privados y limpia el perfil público', async () => {
  await migrar(db, FieldValue, { ejecutar: true });
  const ana = (await db.doc('usuarios/ana').get()).data();
  for (const c of ['email', 'pushToken', 'bloqueados', 'appVersion', 'appVersionCode', 'platform']) {
    assert.equal(ana[c], undefined, `${c} sigue en el perfil público`);
  }
  assert.deepEqual(ana.privacidad, { biblioteca: 'amigos', vistasEnSocial: true, vistasEnMatch: true, solicitudes: 'todos' });
  assert.equal(ana.codigoAmigo, codigoAmigo('ana'));
  assert.equal(ana.username_servido, 'ana');
  const cuenta = (await db.doc('usuarios/ana/privado/cuenta').get()).data();
  assert.equal(cuenta.email, 'ana@ejemplo.com');
  assert.deepEqual(cuenta.bloqueados, ['pepe']);
  assert.equal((await db.doc('usuarios/ana/privado/avisos').get()).data().pushToken, 'ExponentPushToken[ana]');
});

test('solicitudes: la pendiente pasa a {de}_{para} y la aceptada se borra', async () => {
  assert.equal((await db.doc('solicitudes_amistad/aleatoria1').get()).exists, false);
  assert.equal((await db.doc('solicitudes_amistad/aleatoria2').get()).exists, false);
  const nueva = (await db.doc('solicitudes_amistad/pepe_ana').get()).data();
  assert.equal(nueva.estado, 'pendiente');
  assert.equal(nueva.fecha, 5);
});

test('chats con administrador y emoji; match antiguo cancelado', async () => {
  const g = (await db.doc('chats/g').get()).data();
  assert.deepEqual(g.admins, ['ana']);
  assert.equal(g.emoji, '🍿');
  assert.deepEqual((await db.doc('chats/i').get()).data().admins, ['luis']);
  const m = (await db.doc('matches/viejo').get()).data();
  assert.equal(m.estado, 'cancelled');
  assert.deepEqual(m.coincidencias, [603]);
});

test('repetirla no cambia nada (idempotente)', async () => {
  const r = await migrar(db, FieldValue, { ejecutar: true });
  assert.equal(r.perfilesConDatosPrivados, 0);
  assert.equal(r.solicitudesMovidas, 0);
  assert.equal(r.solicitudesBorradas, 0);
  assert.equal(r.chats, 0);
  assert.equal(r.matchesCancelados, 0);
});
