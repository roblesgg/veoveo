function requireEnv(value: string | undefined, key: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`Falta la variable de entorno requerida: ${key}`);
  return trimmed;
}

export const env = {
  tmdbApiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim() || null,
  tmdbReadToken: requireEnv(process.env.EXPO_PUBLIC_TMDB_READ_TOKEN, 'EXPO_PUBLIC_TMDB_READ_TOKEN'),
  firebaseApiKey: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    'EXPO_PUBLIC_FIREBASE_API_KEY',
  ),
  firebaseAuthDomain: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  ),
  firebaseProjectId: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  ),
  firebaseStorageBucket: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  ),
  firebaseMessagingSenderId: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  ),
  firebaseAppId: requireEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, 'EXPO_PUBLIC_FIREBASE_APP_ID'),
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || null,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || null,
  googleWebClientId: requireEnv(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  ),
} as const;
