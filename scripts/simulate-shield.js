const fs = require('fs');
const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = JSON.parse(
  fs.readFileSync('./veoveo-48667-firebase-adminsdk-fbsvc-78adfe1091.json', 'utf8'),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function pushSimulatedVersion() {
  const docRef = db.collection('configuracion').doc('app');
  await docRef.set(
    {
      min_version: '1.9.0',
      release_title: '¡Nueva mega-actualización 1.9.0!',
      release_body:
        'Estas son las notas dinámicas cargadas desde el servidor.\n- Corrección de bugs.\n- Nueva pantalla añadida.\n- Estética pulida.',
    },
    { merge: true },
  );
  console.log('Shield activado. min_version: 1.9.0');
  process.exit(0);
}

pushSimulatedVersion();
