/**
 * Tests de las reglas de Firestore (VeoVeo 3.0) y de Storage contra el emulador.
 * Tres cuentas: Alicia y Beto son amigos; Carla no es amiga de nadie.
 * ✅ debe funcionar · ❌ debe fallar.
 *
 * Ejecutar: npm run test:reglas
 */
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const { arrayUnion, arrayRemove } = firebase.firestore.FieldValue;

const ALICIA = 'alicia';
const BETO = 'beto';
const CARLA = 'carla';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-veoveo',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

after(async () => {
  await env?.cleanup();
});

const perfil = (uid, amigos, privacidad = {}) => ({
  uid,
  username: uid,
  username_servido: uid,
  fotoPerfil: null,
  amigos,
  fechaCreacion: 1,
  privacidad: { biblioteca: 'amigos', vistasEnSocial: true, vistasEnMatch: true, solicitudes: 'todos', ...privacidad },
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`usuarios/${ALICIA}`).set(perfil(ALICIA, [BETO]));
    await db.doc(`usuarios/${BETO}`).set(perfil(BETO, [ALICIA]));
    await db.doc(`usuarios/${CARLA}`).set(perfil(CARLA, []));
    await db.doc(`usuarios/${ALICIA}/privado/cuenta`).set({ email: 'alicia@ejemplo.com', bloqueados: [] });
    await db.doc(`usuarios/${ALICIA}/privado/avisos`).set({ pushToken: 'ExponentPushToken[a]' });
    await db.doc(`usuarios/${BETO}/privado/cuenta`).set({ email: 'beto@ejemplo.com', bloqueados: [] });
    await db.doc(`usuarios/${ALICIA}/peliculas/603`).set({ idPelicula: 603, estado: 'vista', valoracion: 5 });
    await db.doc(`usuarios/${ALICIA}/perfil/preferencias`).set({ carruseles: [] });
    await db.doc('chats/c1').set({
      type: 'individual',
      participants: [ALICIA, BETO],
      admins: [ALICIA],
      createdBy: ALICIA,
      createdAt: 1,
      lastMessage: null,
      activeMatchId: null,
    });
    await db.doc('chats/g1').set({
      type: 'group',
      participants: [ALICIA, BETO],
      admins: [ALICIA],
      createdBy: ALICIA,
      createdAt: 1,
      name: 'Cine de los viernes',
      emoji: '🍿',
    });
    await db.doc('chats/c1/msj/m1').set({ senderId: ALICIA, type: 'text', text: 'hola', timestamp: 1, eliminado: false });
    await db.doc('matches/x1').set({
      chatId: 'c1',
      creatorId: ALICIA,
      participants: [ALICIA, BETO],
      objetivo: 3,
      estado: 'active',
      mazo: [],
      coincidencias: [],
      createdAt: 1,
    });
    await db.doc(`solicitudes_amistad/${CARLA}_${ALICIA}`).set({
      deUid: CARLA,
      paraUid: ALICIA,
      deUsername: CARLA,
      estado: 'pendiente',
      fecha: 1,
    });
    await db.doc('configuracion/app').set({ min_version: '3.0.0' });
  });
});

const como = (uid) => env.authenticatedContext(uid).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();
const bloquear = (quien, aQuien) =>
  env.withSecurityRulesDisabled((ctx) =>
    ctx.firestore().doc(`usuarios/${quien}/privado/cuenta`).set({ bloqueados: [aQuien] }, { merge: true }),
  );

describe('perfil público y privado', () => {
  test('✅ registro con campos públicos', async () => {
    await assertSucceeds(como('nuevo').doc('usuarios/nuevo').set(perfil('nuevo', [])));
  });
  test('❌ el perfil público no admite correo ni token', async () => {
    await assertFails(como('nuevo').doc('usuarios/nuevo').set({ ...perfil('nuevo', []), email: 'x@y.z' }));
    await assertFails(como(ALICIA).doc(`usuarios/${ALICIA}`).update({ pushToken: 't' }));
  });
  test('✅ leer un perfil y buscar con consulta acotada', async () => {
    await assertSucceeds(como(CARLA).doc(`usuarios/${ALICIA}`).get());
    await assertSucceeds(
      como(CARLA).collection('usuarios').where('username_servido', '==', 'alicia').limit(5).get(),
    );
  });
  test('❌ barrer toda la colección de usuarios', async () => {
    await assertFails(como(CARLA).collection('usuarios').get());
    await assertFails(como(CARLA).collection('usuarios').limit(500).get());
  });
  test('✅ datos privados: solo el dueño', async () => {
    await assertSucceeds(como(ALICIA).doc(`usuarios/${ALICIA}/privado/cuenta`).get());
    await assertFails(como(BETO).doc(`usuarios/${ALICIA}/privado/cuenta`).get());
  });
  test('✅ token de avisos: el dueño y sus amigos; ❌ los demás', async () => {
    await assertSucceeds(como(BETO).doc(`usuarios/${ALICIA}/privado/avisos`).get());
    await assertFails(como(CARLA).doc(`usuarios/${ALICIA}/privado/avisos`).get());
    await assertFails(como(BETO).doc(`usuarios/${ALICIA}/privado/avisos`).set({ pushToken: 'falso' }));
  });
});

describe('amistad', () => {
  test('✅ enviar solicitud con id {de}_{para}', async () => {
    await assertSucceeds(
      como(CARLA).doc(`solicitudes_amistad/${CARLA}_${BETO}`).set({ deUid: CARLA, paraUid: BETO, estado: 'pendiente', fecha: 2 }),
    );
  });
  test('❌ solicitud con id que no cuadra, en nombre de otro o ya aceptada', async () => {
    await assertFails(como(CARLA).doc('solicitudes_amistad/cualquiera').set({ deUid: CARLA, paraUid: BETO, estado: 'pendiente' }));
    await assertFails(como(CARLA).doc(`solicitudes_amistad/${BETO}_${ALICIA}`).set({ deUid: BETO, paraUid: ALICIA, estado: 'pendiente' }));
    await assertFails(como(CARLA).doc(`solicitudes_amistad/${CARLA}_${BETO}`).set({ deUid: CARLA, paraUid: BETO, estado: 'aceptada' }));
  });
  test('❌ solicitud a quien me ha bloqueado o no admite solicitudes', async () => {
    await bloquear(BETO, CARLA);
    await assertFails(como(CARLA).doc(`solicitudes_amistad/${CARLA}_${BETO}`).set({ deUid: CARLA, paraUid: BETO, estado: 'pendiente' }));
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`usuarios/${ALICIA}`).set({ privacidad: { solicitudes: 'nadie' } }, { merge: true }),
    );
    await assertFails(como(CARLA).doc(`solicitudes_amistad/${CARLA}_${ALICIA}`).set({ deUid: CARLA, paraUid: ALICIA, estado: 'pendiente' }));
  });
  test('✅ aceptar: Alicia se añade a Carla, añade a Carla y borra la solicitud (en lote)', async () => {
    const db = como(ALICIA);
    const lote = db.batch();
    lote.update(db.doc(`usuarios/${CARLA}`), { amigos: arrayUnion(ALICIA) });
    lote.update(db.doc(`usuarios/${ALICIA}`), { amigos: arrayUnion(CARLA) });
    lote.delete(db.doc(`solicitudes_amistad/${CARLA}_${ALICIA}`));
    await assertSucceeds(lote.commit());
  });
  test('❌ añadirse a los amigos de alguien sin solicitud suya', async () => {
    await assertFails(como(CARLA).doc(`usuarios/${BETO}`).update({ amigos: arrayUnion(CARLA) }));
  });
  test('✅ rechazar (solo el estado) y cancelar (quien la envía)', async () => {
    await assertSucceeds(como(ALICIA).doc(`solicitudes_amistad/${CARLA}_${ALICIA}`).update({ estado: 'rechazada' }));
    await assertSucceeds(como(CARLA).doc(`solicitudes_amistad/${CARLA}_${ALICIA}`).delete());
  });
  test('❌ quien la envía no puede aceptarla él mismo', async () => {
    await assertFails(como(CARLA).doc(`solicitudes_amistad/${CARLA}_${ALICIA}`).update({ estado: 'aceptada' }));
  });
  test('✅ quitar amigo: Beto se quita de Alicia', async () => {
    await assertSucceeds(como(BETO).doc(`usuarios/${ALICIA}`).update({ amigos: arrayRemove(BETO) }));
  });
  test('❌ quitar a un tercero o vaciar la lista de otro', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`usuarios/${ALICIA}`).set({ amigos: [BETO, CARLA] }, { merge: true }),
    );
    await assertFails(como(CARLA).doc(`usuarios/${ALICIA}`).update({ amigos: arrayRemove(BETO) }));
    await assertFails(como(BETO).doc(`usuarios/${ALICIA}`).update({ amigos: [] }));
  });
});

describe('biblioteca', () => {
  test('✅ el dueño y sus amigos la ven', async () => {
    await assertSucceeds(como(ALICIA).collection(`usuarios/${ALICIA}/peliculas`).get());
    await assertSucceeds(como(BETO).collection(`usuarios/${ALICIA}/peliculas`).get());
  });
  test('❌ quien no es amigo, o un amigo si la privacidad es «nadie»', async () => {
    await assertFails(como(CARLA).collection(`usuarios/${ALICIA}/peliculas`).get());
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`usuarios/${ALICIA}`).set({ privacidad: { biblioteca: 'nadie' } }, { merge: true }),
    );
    await assertFails(como(BETO).collection(`usuarios/${ALICIA}/peliculas`).get());
  });
  test('❌ amistad de un solo lado no basta', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`usuarios/${ALICIA}`).set({ amigos: [BETO, CARLA] }, { merge: true }),
    );
    await assertFails(como(CARLA).collection(`usuarios/${ALICIA}/peliculas`).get());
  });
  test('❌ preferencias ajenas', async () => {
    await assertFails(como(BETO).doc(`usuarios/${ALICIA}/perfil/preferencias`).get());
  });
});

describe('chats', () => {
  const chatNuevo = (creador, participantes, type = 'individual') => ({
    type,
    participants: participantes,
    admins: [creador],
    createdBy: creador,
    createdAt: 2,
    lastMessage: null,
    activeMatchId: null,
  });
  test('✅ crear un chat con un amigo', async () => {
    await assertSucceeds(como(ALICIA).collection('chats').add(chatNuevo(ALICIA, [ALICIA, BETO])));
  });
  test('❌ crear un chat con quien no es amigo', async () => {
    await assertFails(como(CARLA).collection('chats').add(chatNuevo(CARLA, [CARLA, ALICIA])));
    await assertFails(como(ALICIA).collection('chats').add(chatNuevo(ALICIA, [ALICIA, BETO, CARLA], 'group')));
  });
  test('❌ crear un chat con un amigo que me ha bloqueado', async () => {
    await bloquear(BETO, ALICIA);
    await assertFails(como(ALICIA).collection('chats').add(chatNuevo(ALICIA, [ALICIA, BETO])));
  });
  test('✅ mensaje firmado y último mensaje', async () => {
    const db = como(BETO);
    await assertSucceeds(db.collection('chats/c1/msj').add({ senderId: BETO, type: 'text', text: 'ey', timestamp: 2, eliminado: false }));
    await assertSucceeds(db.doc('chats/c1').update({ lastMessage: { text: 'ey', senderId: BETO, timestamp: 2 } }));
  });
  test('❌ mensaje en nombre de otro o si el otro me ha bloqueado', async () => {
    await assertFails(como(BETO).collection('chats/c1/msj').add({ senderId: ALICIA, type: 'text', text: 'x', timestamp: 2, eliminado: false }));
    await bloquear(ALICIA, BETO);
    await assertFails(como(BETO).collection('chats/c1/msj').add({ senderId: BETO, type: 'text', text: 'x', timestamp: 2, eliminado: false }));
  });
  test('✅ el autor edita y borra para todos', async () => {
    await assertSucceeds(como(ALICIA).doc('chats/c1/msj/m1').update({ text: 'hola!', editadoEn: 3 }));
    await assertSucceeds(como(ALICIA).doc('chats/c1/msj/m1').update({ text: '', eliminado: true }));
  });
  test('❌ otro participante edita o borra un mensaje ajeno', async () => {
    await assertFails(como(BETO).doc('chats/c1/msj/m1').update({ text: 'cambiado' }));
    await assertFails(como(BETO).doc('chats/c1/msj/m1').delete());
  });
  test('✅ ocultar un mensaje solo para mí; ❌ ocultarlo para otro', async () => {
    await assertSucceeds(como(BETO).doc('chats/c1/msj/m1').update({ ocultoPara: arrayUnion(BETO) }));
    await assertFails(como(BETO).doc('chats/c1/msj/m1').update({ ocultoPara: arrayUnion(ALICIA) }));
  });
  test('✅ marcar leído, silenciar u ocultar el chat (mi estado)', async () => {
    await assertSucceeds(como(BETO).doc(`chats/c1/miembros/${BETO}`).set({ ultimaLectura: 5, silenciado: true, oculto: false }));
    await assertSucceeds(como(ALICIA).doc(`chats/c1/miembros/${BETO}`).get());
  });
  test('❌ tocar el estado de otro miembro o leerlo sin estar en el chat', async () => {
    await assertFails(como(ALICIA).doc(`chats/c1/miembros/${BETO}`).set({ silenciado: true }));
    await assertFails(como(CARLA).doc(`chats/c1/miembros/${BETO}`).get());
  });
  test('❌ nadie borra un chat para todos ni cambia sus participantes (chat individual)', async () => {
    await assertFails(como(ALICIA).doc('chats/c1').delete());
    await assertFails(como(ALICIA).doc('chats/c1').update({ participants: [ALICIA] }));
  });
  test('✅ el administrador renombra, cambia el emoji y añade a un amigo suyo', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`usuarios/${ALICIA}`).set({ amigos: [BETO, CARLA] }, { merge: true }),
    );
    await assertSucceeds(como(ALICIA).doc('chats/g1').update({ name: 'Pelis', emoji: '🎬' }));
    await assertSucceeds(como(ALICIA).doc('chats/g1').update({ participants: arrayUnion(CARLA) }));
  });
  test('❌ quien no es administrador gestiona el grupo', async () => {
    await assertFails(como(BETO).doc('chats/g1').update({ name: 'Mío' }));
    await assertFails(como(BETO).doc('chats/g1').update({ admins: [BETO] }));
  });
  test('✅ salir del grupo', async () => {
    await assertSucceeds(como(BETO).doc('chats/g1').update({ participants: arrayRemove(BETO) }));
  });
  test('✅ el único administrador sale y deja a otro de administrador', async () => {
    await assertSucceeds(como(ALICIA).doc('chats/g1').update({ participants: [BETO], admins: [BETO] }));
  });
  test('❌ al salir, sacar a otro', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc('chats/g1').set({ participants: [ALICIA, BETO, CARLA] }, { merge: true }),
    );
    await assertFails(como(BETO).doc('chats/g1').update({ participants: [ALICIA] }));
  });
  test('❌ quien no participa no lee', async () => {
    await assertFails(como(CARLA).doc('chats/c1').get());
    await assertFails(como(CARLA).collection('chats/c1/msj').get());
  });
});

describe('movie match', () => {
  const matchNuevo = (creador, participantes, chatId = null) => ({
    chatId,
    creatorId: creador,
    participants: participantes,
    objetivo: 3,
    estado: 'active',
    mazo: [],
    coincidencias: [],
    createdAt: 2,
  });
  test('✅ desde un chat, con su gente', async () => {
    await assertSucceeds(como(ALICIA).collection('matches').add(matchNuevo(ALICIA, [ALICIA, BETO], 'c1')));
  });
  test('✅ sin chat, con amigos elegidos a mano', async () => {
    await assertSucceeds(como(ALICIA).collection('matches').add(matchNuevo(ALICIA, [ALICIA, BETO])));
  });
  test('❌ con quien no es amigo ni está en el chat', async () => {
    await assertFails(como(ALICIA).collection('matches').add(matchNuevo(ALICIA, [ALICIA, CARLA])));
    await assertFails(como(ALICIA).collection('matches').add(matchNuevo(ALICIA, [ALICIA, BETO, CARLA], 'c1')));
  });
  test('✅ cada uno escribe sus votos y lee los de todos', async () => {
    await assertSucceeds(como(BETO).doc(`matches/x1/votos/${BETO}`).set({ si: [603], no: [], actualizadoEn: 3 }));
    await assertSucceeds(como(ALICIA).doc(`matches/x1/votos/${BETO}`).get());
  });
  test('❌ votar en nombre de otro', async () => {
    await assertFails(como(BETO).doc(`matches/x1/votos/${ALICIA}`).set({ si: [603], no: [] }));
  });
  test('✅ registrar coincidencias y terminar antes', async () => {
    await assertSucceeds(como(BETO).doc('matches/x1').update({ coincidencias: arrayUnion(603) }));
    await assertSucceeds(como(BETO).doc('matches/x1').update({ estado: 'finished', terminadoPor: BETO, finishedAt: 4 }));
  });
  test('❌ cambiar participantes o el mazo; quien no participa', async () => {
    await assertFails(como(BETO).doc('matches/x1').update({ participants: [BETO] }));
    await assertFails(como(BETO).doc('matches/x1').update({ mazo: [1] }));
    await assertFails(como(CARLA).doc('matches/x1').get());
    await assertFails(como(CARLA).doc(`matches/x1/votos/${CARLA}`).set({ si: [], no: [] }));
  });
});

describe('denuncias y configuración', () => {
  test('✅ crear una denuncia propia; ❌ leerla o firmarla por otro', async () => {
    await assertSucceeds(
      como(CARLA).collection('denuncias').add({ de: CARLA, contra: ALICIA, tipo: 'usuario', ref: ALICIA, motivo: 'spam', fecha: 1 }),
    );
    await assertFails(como(CARLA).collection('denuncias').get());
    await assertFails(como(CARLA).collection('denuncias').add({ de: BETO, contra: ALICIA, tipo: 'usuario', motivo: 'x', fecha: 1 }));
  });
  test('✅ configuración pública; ❌ escribirla', async () => {
    await assertSucceeds(anonimo().doc('configuracion/app').get());
    await assertFails(como(ALICIA).doc('configuracion/app').set({ min_version: '9' }));
  });
  test('❌ colecciones sin regla', async () => {
    await assertFails(como(ALICIA).doc('cualquier/cosa').set({ a: 1 }));
  });
});

describe('storage', () => {
  test('❌ nadie lee ni sube archivos', async () => {
    const storage = env.authenticatedContext(ALICIA).storage();
    await assertFails(storage.ref('perfiles/alicia.jpg').putString('hola'));
  });
});
