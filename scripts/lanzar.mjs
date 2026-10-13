/**
 * LANZAMIENTO — pasos 7 y 8 del proceso de release:
 *   7. Actualiza min_version en Firestore (fuerza actualización a usuarios)
 *   8. Envía push notification a todos los dispositivos
 *
 * Ejecutar SOLO cuando el APK ya esté publicado en GitHub Releases.
 * Uso: npm run lanzar
 */

import fs from 'fs';
import { execSync } from 'child_process';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
const version = appJson.expo.version;

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync('./firebase-admin.json', 'utf8'));
} catch {
  console.error('❌ No se encontró firebase-admin.json');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Pasos 1-6: Build web + deploy Vercel ─────────────────────────────────────
async function buildAndDeployWeb() {
  console.log('\n🌐 Paso 1 — Build web (expo export)...');
  execSync('npx expo export --platform web', { stdio: 'inherit' });

  console.log('\n📁 Paso 2 — Sincronizando dist/ → public/...');
  execSync('xcopy /E /I /Y dist\\_expo public\\_expo > nul', { stdio: 'inherit', shell: true });
  execSync('xcopy /E /I /Y dist\\assets public\\assets > nul', { stdio: 'inherit', shell: true });
  execSync('copy /Y dist\\index.html public\\index.html > nul', { stdio: 'inherit', shell: true });
  execSync('copy /Y dist\\metadata.json public\\metadata.json > nul', {
    stdio: 'inherit',
    shell: true,
  });

  console.log('\n🚀 Paso 3 — Deploying a Vercel (producción)...');
  execSync('npx vercel --cwd public --prod', { stdio: 'inherit' });
  console.log('✅ Web deployada en producción');
}

// ── Paso 7: Actualizar min_version en Firestore ──────────────────────────────
async function actualizarVersion() {
  console.log(`\n📦 Paso 7 — Actualizando min_version a ${version} en Firestore...`);
  await db
    .collection('configuracion')
    .doc('app')
    .set(
      {
        min_version: version,
        download_url: 'https://veoveo.dripdev.dev/descargar',
        release_title: 'Nueva actualización disponible',
        release_body: `VeoVeo ${version} ya está disponible con mejoras y correcciones. Actualiza para disfrutar de la mejor experiencia.`,
      },
      { merge: true },
    );
  console.log(`✅ min_version actualizada a ${version}`);
}

// ── Paso 8: Enviar push a todos los dispositivos ─────────────────────────────
async function enviarNotificaciones() {
  console.log('\n📲 Paso 8 — Enviando notificación push a todos los usuarios...');
  const snap = await db.collection('usuarios').get();
  const tokens = [];
  snap.forEach((doc) => {
    const token = doc.data().pushToken;
    if (token && typeof token === 'string' && token.startsWith('ExponentPushToken')) {
      tokens.push(token);
    }
  });

  if (tokens.length === 0) {
    console.log('⚠️  No se encontraron tokens. Los usuarios deben abrir la app al menos una vez.');
    return;
  }

  console.log(`📱 ${tokens.length} dispositivos encontrados.`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages = batch.map((token) => ({
      to: token,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      title: `🚀 VeoVeo ${version} disponible`,
      body: 'Hay una nueva versión con mejoras. Actualiza ahora.',
      data: { url: 'https://veoveo.dripdev.dev/descargar' },
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const json = await res.json();
    const results = json.data || [];
    const ok = results.filter((r) => r.status === 'ok').length;
    const errors = results.filter((r) => r.status !== 'ok');
    console.log(`  ✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${ok} enviadas`);
    if (errors.length > 0) errors.forEach((e) => console.warn(`  ⚠️  ${e.message}`));
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🚀 LANZAMIENTO VeoVeo ${version}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await buildAndDeployWeb();
  await actualizarVersion();
  await enviarNotificaciones();

  console.log('\n✅ Lanzamiento completado.');
  console.log('   • Web deployada en Vercel (veoveo.dripdev.dev)');
  console.log(`   • min_version en Firestore: ${version}`);
  console.log('   • Notificaciones enviadas a todos los dispositivos');
  console.log('   • Verifica el APK en: github.com/roblesgg/VeoVeo/releases');
  process.exit(0);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
