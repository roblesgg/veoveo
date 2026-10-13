// Carga .env antes de que Metro lea EXPO_PUBLIC_* (depuración en móvil con Expo Go).
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const appJson = require('./app.json');

const IS_TEST = process.env.APP_ENV === 'test';
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
  },
  scheme: IS_TEST ? 'veoveotest' : 'veoveo',
  plugins: [...(appJson.expo.plugins || [])],
};
