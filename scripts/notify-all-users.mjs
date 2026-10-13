import fs from 'fs';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const TITLE = '🚀 VeoVeo 2.0 ya está disponible';
const BODY = 'Descarga la nueva versión con Movie Match mejorado y correcciones de amistad.';
const DATA = { url: 'https://veoveo.dripdev.dev/descargar' };
const BATCH_SIZE = 100; // Límite de Expo Push API por petición

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync('./firebase-admin.json', 'utf8'));
} catch {
  console.error('❌ No se encontró firebase-admin.json');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function sendBatch(tokens) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    priority: 'high',
    channelId: 'default',
    title: TITLE,
    body: BODY,
    data: DATA,
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const json = await res.json();
  const results = json.data || [];
  const ok = results.filter((r) => r.status === 'ok').length;
  const errors = results.filter((r) => r.status !== 'ok');

  console.log(`  ✅ ${ok} enviadas`);
  if (errors.length > 0) {
    errors.forEach((e) => console.warn(`  ⚠️  ${e.message || JSON.stringify(e)}`));
  }
}

async function main() {
  console.log('📋 Leyendo usuarios de Firestore...');
  const snap = await db.collection('usuarios').get();

  const tokens = [];
  snap.forEach((doc) => {
    const token = doc.data().pushToken;
    if (token && typeof token === 'string' && token.startsWith('ExponentPushToken')) {
      tokens.push(token);
    }
  });

  if (tokens.length === 0) {
    console.log(
      '⚠️  No se encontraron tokens de push. Los usuarios deben haber abierto la app al menos una vez.',
    );
    process.exit(0);
  }

  console.log(`📱 ${tokens.length} dispositivos con token. Enviando en lotes de ${BATCH_SIZE}...`);

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    console.log(`Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tokens.length / BATCH_SIZE)}:`);
    await sendBatch(batch);
  }

  console.log('\n🎉 Notificaciones enviadas.');
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
