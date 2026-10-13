import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-admin.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function updateVersion() {
  const configRef = db.collection('configuracion').doc('app');

  await configRef.set(
    {
      min_version: '1.9.1',
      download_url: 'https://veoveo.dripdev.dev/descargar',
      release_title: 'Actualización Crítica v1.9.1',
      release_body:
        'Hemos corregido el error de instalación en varios dispositivos. Actualiza ahora para disfrutar de la experiencia optimizada.',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log('✅ Firestore version updated to 1.9.1');
}

updateVersion().catch(console.error);
