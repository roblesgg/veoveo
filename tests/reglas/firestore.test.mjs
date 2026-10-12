/**
 * Tests de las reglas de Firestore y Storage contra el emulador.
 * Cada caso reproduce una llamada real de la app 2.0.4 (✅ debe funcionar)
 * o un ataque (❌ debe fallar).
 *
 * Ejecutar: npm run test:reglas
 */
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const { arrayUnion, arrayRemove } = firebase.firestore.FieldValue;

const ALICIA = 'alicia';
const BETO = 'beto'; // amigo de Alicia
const CARLA = 'carla'; // no es amiga de nadie

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

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const perfil = (uid, amigos) => ({
      uid,
      username: uid,
      username_servido: uid,
      email: `${uid}@ejemplo.com`,
      fotoPerfil: null,
      amigos,
      fechaCreacion: 1,
    });
    await db.doc(`usuarios/${ALICIA}`).set(perfil(ALICIA, [BETO]));
    await db.doc(`usuarios/${BETO}`).set(perfil(BETO, [ALICIA]));
    await db.doc(`usuarios/${CARLA}`).set(perfil(CARLA, []));
    await db.doc(`usuarios/${ALICIA}/peliculas/603`).set({ idPelicula: 603, estado: 'por_ver' });
    await db.doc(`usuarios/${ALICIA}/tierLists/t1`).set({ titulo: 'Mejores' });
    await db.doc(`usuarios/${ALICIA}/perfil/preferencias`).set({ idioma: 'es' });
    await db.doc(`usuarios/${ALICIA}/biblioteca/por_ver`).set({ peliculas: [] });
    await db.doc('chats/c1').set({
      type: 'individual',
      participants: [ALICIA, BETO],
      createdAt: 1,
      name: null,
      lastMessage: null,
      activeMatchId: null,
    });
    await db.doc('chats/c1/msj/m1').set({ senderId: ALICIA, text: 'hola', timestamp: 1 });
    await db.doc('matches/x1').set({
      chatId: 'c1',
      creatorId: ALICIA,
      participants: [ALICIA, BETO],
      status: 'active',
      settings: { targetMatches: 3, excludeSeen: false },
      matchedMovies: [],
      votes: {},
      noVotes: {},
      createdAt: 1,
    });
    await db.doc('solicitudes_amistad/s1').set({
      deUid: CARLA,
      deUsername: CARLA,
      paraUid: ALICIA,
      paraUsername: ALICIA,
      estado: 'pendiente',
      timestamp: 1,
    });
    await db.doc('configuracion/app').set({ min_version: '2.0.4' });
  });
});

const como = (uid) => env.authenticatedContext(uid).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

describe('usuarios/{uid}', () => {
  test('✅ registro: crea su propio perfil', async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc('usuarios/nuevo').delete());
    await assertSucceeds(
      como('nuevo').doc('usuarios/nuevo').set({ uid: 'nuevo', username: 'n', email: 'n@e.com', amigos: [] }),
    );
  });

  test('❌ no puede crear el perfil de otro', async () => {
    await assertFails(como(CARLA).doc('usuarios/otro').set({ uid: 'otro', amigos: [] }));
  });

  test('✅ buscador: cualquiera con sesión lista perfiles (2.0.4)', async () => {
    await assertSucceeds(como(CARLA).collection('usuarios').get());
  });

  test('❌ sin sesión no se leen perfiles', async () => {
    await assertFails(anonimo().doc(`usuarios/${ALICIA}`).get());
  });

  test('✅ actualiza su propio perfil (nombre, estado, pushToken, bloqueados)', async () => {
    await assertSucceeds(
      como(ALICIA).doc(`usuarios/${ALICIA}`).update({
        username: 'Ali',
        estado: 'online',
        pushToken: 'ExponentPushToken[x]',
        bloqueados: arrayUnion(CARLA),
      }),
    );
  });

  test('✅ aceptar solicitud: Alicia se añade a la lista de Carla', async () => {
    await assertSucceeds(como(ALICIA).doc(`usuarios/${CARLA}`).update({ amigos: arrayUnion(ALICIA) }));
  });

  test('✅ eliminar amigo: Beto se quita de la lista de Alicia', async () => {
    await assertSucceeds(como(BETO).doc(`usuarios/${ALICIA}`).update({ amigos: arrayRemove(BETO) }));
  });

  test('✅ bloquear a quien no es amigo (quitarse de una lista donde no está)', async () => {
    await assertSucceeds(como(CARLA).doc(`usuarios/${BETO}`).update({ amigos: arrayRemove(CARLA) }));
  });

  test('❌ ataque: añadir a un tercero a la lista de amigos de otro', async () => {
    await assertFails(como(CARLA).doc(`usuarios/${ALICIA}`).update({ amigos: arrayUnion('mallory') }));
  });

  test('❌ ataque: vaciar la lista de amigos de otro', async () => {
    await assertFails(como(CARLA).doc(`usuarios/${ALICIA}`).update({ amigos: [] }));
  });

  test('❌ ataque: quitar a un amigo ajeno de la lista de otro', async () => {
    await assertFails(como(CARLA).doc(`usuarios/${ALICIA}`).update({ amigos: arrayRemove(BETO) }));
  });

  test('❌ ataque: cambiar otro campo del perfil ajeno junto con amigos', async () => {
    await assertFails(
      como(CARLA).doc(`usuarios/${ALICIA}`).update({ amigos: arrayUnion(CARLA), username: 'hackeada' }),
    );
  });

  test('❌ ataque: borrar el perfil de otro', async () => {
    await assertFails(como(CARLA).doc(`usuarios/${ALICIA}`).delete());
  });
});

describe('subcolecciones de usuarios', () => {
  test('✅ el dueño lee y escribe su biblioteca', async () => {
    await assertSucceeds(
      como(ALICIA).collection(`usuarios/${ALICIA}/peliculas`).where('estado', '==', 'por_ver').get(),
    );
    await assertSucceeds(
      como(ALICIA).doc(`usuarios/${ALICIA}/peliculas/550`).set({ idPelicula: 550, estado: 'vista' }),
    );
  });

  test('✅ un amigo lee la biblioteca (BibliotecaAmigo, actividad de amigos)', async () => {
    await assertSucceeds(
      como(BETO).collection(`usuarios/${ALICIA}/peliculas`).where('estado', '==', 'por_ver').get(),
    );
    await assertSucceeds(como(BETO).doc(`usuarios/${ALICIA}/peliculas/603`).get());
  });

  test('❌ quien no es amigo no lee la biblioteca', async () => {
    await assertFails(como(CARLA).collection(`usuarios/${ALICIA}/peliculas`).get());
  });

  test('❌ un amigo no escribe en la biblioteca ajena', async () => {
    await assertFails(como(BETO).doc(`usuarios/${ALICIA}/peliculas/603`).delete());
  });

  test('✅ el dueño lee sus tier lists y preferencias', async () => {
    await assertSucceeds(como(ALICIA).collection(`usuarios/${ALICIA}/tierLists`).get());
    await assertSucceeds(como(ALICIA).doc(`usuarios/${ALICIA}/perfil/preferencias`).set({ idioma: 'en' }));
  });

  test('❌ nadie más lee tier lists ni preferencias, ni siendo amigo', async () => {
    await assertFails(como(BETO).collection(`usuarios/${ALICIA}/tierLists`).get());
    await assertFails(como(BETO).doc(`usuarios/${ALICIA}/perfil/preferencias`).get());
  });

  test('✅ Movie Match 2.0.4: lee la ruta antigua biblioteca/por_ver de cada participante', async () => {
    await assertSucceeds(como(CARLA).doc(`usuarios/${ALICIA}/biblioteca/por_ver`).get());
    await assertSucceeds(como(CARLA).doc(`usuarios/${ALICIA}/biblioteca/vistas`).get());
  });

  test('❌ nadie escribe en la biblioteca antigua de otro', async () => {
    await assertFails(como(CARLA).doc(`usuarios/${ALICIA}/biblioteca/por_ver`).set({ peliculas: [] }));
  });
});

describe('solicitudes_amistad', () => {
  test('✅ enviar una solicitud', async () => {
    await assertSucceeds(
      como(CARLA).collection('solicitudes_amistad').add({
        deUid: CARLA,
        deUsername: CARLA,
        paraUid: BETO,
        paraUsername: '',
        estado: 'pendiente',
        timestamp: 2,
      }),
    );
  });

  test('❌ enviar una solicitud en nombre de otro', async () => {
    await assertFails(
      como(CARLA).collection('solicitudes_amistad').add({ deUid: BETO, paraUid: ALICIA, estado: 'pendiente' }),
    );
  });

  test('❌ crear una solicitud ya aceptada', async () => {
    await assertFails(
      como(CARLA).collection('solicitudes_amistad').add({ deUid: CARLA, paraUid: BETO, estado: 'aceptada' }),
    );
  });

  test('✅ ver las pendientes recibidas y enviadas', async () => {
    await assertSucceeds(
      como(ALICIA).collection('solicitudes_amistad').where('paraUid', '==', ALICIA).where('estado', '==', 'pendiente').get(),
    );
    await assertSucceeds(
      como(CARLA).collection('solicitudes_amistad').where('deUid', '==', CARLA).where('estado', '==', 'pendiente').get(),
    );
  });

  test('✅ aceptar o rechazar (cambia solo el estado)', async () => {
    await assertSucceeds(como(ALICIA).doc('solicitudes_amistad/s1').update({ estado: 'aceptada' }));
  });

  test('❌ cambiar a quién va dirigida', async () => {
    await assertFails(como(ALICIA).doc('solicitudes_amistad/s1').update({ paraUid: BETO }));
  });

  test('❌ un tercero no la ve ni la toca', async () => {
    await assertFails(como(BETO).doc('solicitudes_amistad/s1').get());
    await assertFails(como(BETO).doc('solicitudes_amistad/s1').update({ estado: 'rechazada' }));
  });
});

describe('chats', () => {
  test('✅ crear un chat incluyéndose a sí mismo', async () => {
    await assertSucceeds(
      como(ALICIA).collection('chats').add({
        type: 'group',
        participants: [ALICIA, BETO, CARLA],
        createdAt: 2,
        name: null,
        lastMessage: null,
        activeMatchId: null,
      }),
    );
  });

  test('❌ crear un chat sin estar dentro', async () => {
    await assertFails(como(CARLA).collection('chats').add({ type: 'individual', participants: [ALICIA, BETO] }));
  });

  test('✅ lista de mis chats y búsqueda de chat existente', async () => {
    await assertSucceeds(
      como(BETO).collection('chats').where('participants', 'array-contains', BETO).orderBy('createdAt', 'desc').get(),
    );
    await assertSucceeds(
      como(ALICIA).collection('chats').where('type', '==', 'individual').where('participants', 'array-contains', ALICIA).get(),
    );
  });

  test('❌ quien no participa no lee el chat ni sus mensajes', async () => {
    await assertFails(como(CARLA).doc('chats/c1').get());
    await assertFails(como(CARLA).collection('chats/c1/msj').get());
  });

  test('✅ enviar mensaje y actualizar el último mensaje (como enviarMensaje)', async () => {
    const db = como(BETO);
    await assertSucceeds(db.collection('chats/c1/msj').add({ senderId: BETO, senderName: 'beto', text: 'hey', timestamp: 3 }));
    await assertSucceeds(
      db.doc('chats/c1').update({ 'lastMessage.text': 'hey', 'lastMessage.senderId': BETO, 'lastMessage.timestamp': 3 }),
    );
  });

  test('❌ ataque: mensaje en nombre de otro', async () => {
    await assertFails(como(BETO).collection('chats/c1/msj').add({ senderId: ALICIA, text: 'soy Alicia', timestamp: 3 }));
  });

  test('❌ ataque: último mensaje firmado por otro', async () => {
    await assertFails(
      como(BETO).doc('chats/c1').update({ 'lastMessage.text': 'x', 'lastMessage.senderId': ALICIA, 'lastMessage.timestamp': 3 }),
    );
  });

  test('❌ ataque: meter o sacar participantes', async () => {
    await assertFails(como(BETO).doc('chats/c1').update({ participants: [ALICIA, BETO, CARLA] }));
    await assertFails(como(BETO).doc('chats/c1').update({ participants: [BETO] }));
  });

  test('❌ ataque: editar o borrar el mensaje de otro', async () => {
    await assertFails(como(BETO).doc('chats/c1/msj/m1').update({ text: 'cambiado' }));
    await assertFails(como(BETO).doc('chats/c1/msj/m1').delete());
  });

  test('✅ renombrar el grupo y enlazar el match activo', async () => {
    await assertSucceeds(como(BETO).doc('chats/c1').update({ name: 'Pelis' }));
    await assertSucceeds(como(BETO).doc('chats/c1').update({ activeMatchId: 'x1' }));
  });

  test('✅ borrar un chat en el que participa (2.0.4)', async () => {
    await assertSucceeds(como(BETO).doc('chats/c1').delete());
  });
});

describe('matches', () => {
  const nuevoMatch = (creatorId, participants) => ({
    chatId: 'c1',
    creatorId,
    participants,
    status: 'active',
    settings: { targetMatches: 3, excludeSeen: false },
    matchedMovies: [],
    votes: {},
    noVotes: {},
    createdAt: 2,
  });

  test('✅ iniciar un match con la gente del chat', async () => {
    await assertSucceeds(como(ALICIA).collection('matches').add(nuevoMatch(ALICIA, [ALICIA, BETO])));
  });

  test('❌ meter en el match a alguien que no está en el chat', async () => {
    await assertFails(como(ALICIA).collection('matches').add(nuevoMatch(ALICIA, [ALICIA, BETO, CARLA])));
  });

  test('❌ crear un match en nombre de otro o desde fuera del chat', async () => {
    await assertFails(como(ALICIA).collection('matches').add(nuevoMatch(BETO, [ALICIA, BETO])));
    await assertFails(como(CARLA).collection('matches').add({ ...nuevoMatch(CARLA, [CARLA]), chatId: 'c1' }));
  });

  test('✅ votar, registrar match y terminar (como votarPelicula)', async () => {
    const db = como(BETO);
    await assertSucceeds(db.doc('matches/x1').update({ 'votes.603': arrayUnion(BETO) }));
    await assertSucceeds(db.doc('matches/x1').update({ 'noVotes.550': arrayUnion(BETO) }));
    await assertSucceeds(db.doc('matches/x1').update({ matchedMovies: arrayUnion(603) }));
    await assertSucceeds(db.doc('matches/x1').update({ status: 'finished', finishedAt: 4 }));
    await assertSucceeds(db.doc('chats/c1').update({ activeMatchId: null }));
  });

  test('❌ ataque: cambiar participantes o ajustes de la partida', async () => {
    await assertFails(como(BETO).doc('matches/x1').update({ participants: [BETO] }));
    await assertFails(como(BETO).doc('matches/x1').update({ creatorId: BETO }));
    await assertFails(como(BETO).doc('matches/x1').update({ 'settings.targetMatches': 1 }));
  });

  test('❌ quien no participa no lee ni vota', async () => {
    await assertFails(como(CARLA).doc('matches/x1').get());
    await assertFails(como(CARLA).doc('matches/x1').update({ 'votes.603': arrayUnion(CARLA) }));
  });

  test('❌ nadie borra una partida', async () => {
    await assertFails(como(ALICIA).doc('matches/x1').delete());
  });
});

describe('configuracion/app', () => {
  test('✅ se lee sin sesión (aviso de versión mínima)', async () => {
    await assertSucceeds(anonimo().doc('configuracion/app').get());
  });

  test('❌ nadie la escribe desde la app', async () => {
    await assertFails(como(ALICIA).doc('configuracion/app').set({ min_version: '9.9.9' }));
  });
});

describe('colecciones sin regla', () => {
  test('❌ todo lo demás está cerrado', async () => {
    await assertFails(como(ALICIA).doc('cualquier/cosa').get());
    await assertFails(como(ALICIA).doc('cualquier/cosa').set({ a: 1 }));
  });
});

describe('storage', () => {
  test('❌ nadie lee ni sube archivos', async () => {
    const storage = env.authenticatedContext(ALICIA).storage();
    await assertFails(storage.ref('perfiles/alicia.jpg').getDownloadURL());
    await assertFails(storage.ref('perfiles/alicia.jpg').putString('hola'));
  });
});
