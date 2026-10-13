/**
 * ARCHIVO: services/firebase.ts
 * DESCRIPCIÓN: Configuración centralizada de Firebase (App, Auth, Firestore y Storage).
 * Implementa un patrón Singleton para asegurar que cada servicio se inicialice una sola vez.
 */

import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { env } from '../config/env';

// Instancias globales (Singletons)
let authSingleton: Auth | null = null;
let firestoreSingleton: Firestore | null = null;
let storageSingleton: FirebaseStorage | null = null;
let appSingleton: FirebaseApp | null = null;

/**
 * Lee las variables de entorno para configurar Firebase.
 */
function readConfig(): FirebaseOptions | null {
  try {
    return {
      apiKey: env.firebaseApiKey,
      authDomain: env.firebaseAuthDomain,
      projectId: env.firebaseProjectId,
      storageBucket: env.firebaseStorageBucket,
      messagingSenderId: env.firebaseMessagingSenderId,
      appId: env.firebaseAppId,
    };
  } catch {
    return null;
  }
}

/**
 * Inicializa o recupera la instancia principal de Firebase App.
 */
export function getFirebaseApp(): FirebaseApp | null {
  const cfg = readConfig();
  if (!cfg?.apiKey) return null;
  if (getApps().length === 0) {
    appSingleton = initializeApp(cfg);
  } else {
    appSingleton = getApps()[0]!;
  }
  return appSingleton;
}

/**
 * Inicializa o recupera el servicio de Autenticación.
 * Configura la persistencia según la plataforma (Web vs Native).
 */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;

  if (!authSingleton) {
    if (Platform.OS === 'web') {
      authSingleton = getAuth(app);
    } else {
      try {
        // En plataformas nativas usamos AsyncStorage para mantener la sesión abierta
        const persistence = (getReactNativePersistence as any)(ReactNativeAsyncStorage);
        authSingleton = initializeAuth(app, { persistence });
      } catch {
        // Fallback en caso de error en la inicialización nativa
        authSingleton = getAuth(app);
      }
    }
  }
  return authSingleton;
}

/**
 * Inicializa o recupera el servicio de base de datos Firestore.
 */
export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!firestoreSingleton) firestoreSingleton = getFirestore(app);
  return firestoreSingleton;
}

/**
 * Inicializa o recupera el servicio de almacenamiento de archivos (Storage).
 */
export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!storageSingleton) storageSingleton = getStorage(app);
  return storageSingleton;
}

/**
 * HELPER: dbOrThrow
 * Lanza un error si Firestore no está disponible (error crítico de configuración).
 */
export function dbOrThrow(): Firestore {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firebase no configurado');
  return db;
}

/**
 * HELPER: uidOrThrow
 * Lanza un error si intentamos realizar una acción que requiere estar autenticado.
 */
export function uidOrThrow(): string {
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!uid) throw new Error('Usuario no autenticado');
  return uid;
}
