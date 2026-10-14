// Carga .env antes de que Metro lea EXPO_PUBLIC_* (depuración en móvil con Expo Go).
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const appJson = require('./app.json');

const IS_TEST = process.env.APP_ENV === 'test';

// El APK de pruebas usa SIEMPRE el Firebase de pruebas (veoveo-pruebas) y nunca producción.
// Ver docs/entornos.md.
const PROYECTO_PRUEBAS = 'veoveo-pruebas';
if (IS_TEST) {
  require('dotenv').config({
    path: require('path').join(__dirname, '.env.pruebas.local'),
    override: true,
  });
}
const proyectoFirebase = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
if (IS_TEST && proyectoFirebase !== PROYECTO_PRUEBAS) {
  throw new Error(
    `El APK de pruebas tiene que usar ${PROYECTO_PRUEBAS} y apunta a «${proyectoFirebase}». Falta .env.pruebas.local.`,
  );
}
if (!IS_TEST && proyectoFirebase === PROYECTO_PRUEBAS) {
  throw new Error(
    'La app de Play no puede usar el Firebase de pruebas. Quita APP_ENV o las variables de pruebas.',
  );
}
const REQUIRED_ENV_KEYS = [
  'EXPO_PUBLIC_TMDB_READ_TOKEN',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
];

const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]?.trim());
if (missingKeys.length > 0 && !process.env.CI && !process.env.EAS_BUILD) {
  throw new Error(`Faltan variables de entorno requeridas: ${missingKeys.join(', ')}`);
}

module.exports = {
  ...appJson.expo,
  owner: 'drip-dev',
  name: IS_TEST ? 'VeoVeo Test' : 'VeoVeo',
  android: {
    ...appJson.expo.android,
    package: IS_TEST ? 'com.roblesgg.veoveo.test' : appJson.expo.android.package,
    // Los enlaces https de veoveo.dripdev.dev solo los abre la app de Play (assetlinks.json)
    intentFilters: IS_TEST ? [] : appJson.expo.android.intentFilters,
    // Avisos push en Android (FCM): cada variante con el google-services.json de su proyecto.
    // Solo identificadores públicos de cliente; sin claves privadas.
    googleServicesFile: IS_TEST
      ? './google-services.pruebas.json'
      : require('fs').existsSync(require('path').join(__dirname, 'google-services.json'))
        ? './google-services.json'
        : undefined,
  },
  scheme: IS_TEST ? 'veoveotest' : 'veoveo',
  plugins: [...(appJson.expo.plugins || [])],
};
