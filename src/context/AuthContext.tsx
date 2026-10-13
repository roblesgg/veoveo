/**
 * ARCHIVO: context/AuthContext.tsx
 * DESCRIPCIÓN: Proveedor de autenticación que gestiona el ciclo de vida de la sesión del usuario.
 * Integra Firebase Auth con perfiles de Firestore y sincronización de estado local/remoto.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  signInWithEmailAndPassword,
  signOut,
  type User,
  GoogleAuthProvider,
  signInWithCredential,
  linkWithCredential,
  unlink,
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  verifyBeforeUpdateEmail,
  deleteUser,
  EmailAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getFirebaseAuth } from '../services/firebase';
import {
  actualizarEstadoConexion,
  asegurarPerfilFirestore,
  registrarSesion,
} from '../services/repositorioUsuarios';
import { obtenerTokenSiHayPermiso } from '../services/notificationService';
import { env } from '../config/env';

/**
 * Interfaz que define los métodos y estados expuestos por el contexto de autenticación.
 */
type AuthContextValue = {
  user: User | null; // Usuario actual de Firebase
  loading: boolean; // Indica si se está verificando la sesión inicial
  firebaseReady: boolean; // Indica si Firebase está correctamente configurado
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  unlinkGoogleAccount: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  reauthenticate: (password?: string) => Promise<void>;
  changeEmail: (nuevo: string) => Promise<void>;
  deleteAuthUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * COMPONENTE: AuthProvider
 * Gestiona el estado de autenticación y los efectos secundarios relacionados.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = getFirebaseAuth();
  const firebaseReady = auth != null;

  // EFECTO: Configuración de Google Sign-In para plataformas nativas
  useEffect(() => {
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        webClientId: env.googleWebClientId,
        offlineAccess: true,
      });
    }
  }, []);

  // EFECTO: Escuchar cambios en el estado de autenticación de Firebase
  useEffect(() => {
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      // Al iniciar sesión: perfil (1 lectura) y estado, versión y token en 1 sola escritura.
      if (u) {
        void (async () => {
          try {
            const [, token] = await Promise.all([asegurarPerfilFirestore(u), obtenerTokenSiHayPermiso()]);
            await registrarSesion(u.uid, token);
          } catch {
            // Sin conexión: se reintenta en el próximo arranque
          }
        })();
        void require('../services/userPreferences').sincronizarPreferenciasConFirestore(u.uid);
      }
    });

    // 🕒 Timeout de seguridad: Si la sesión tarda más de 5s, asumimos que no hay sesión
    // Esto evita que la pantalla de carga se quede infinita en conexiones lentas o errores de red.
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ [Auth] La sesión tarda demasiado en responder. Forzando paso a Login.');
        setLoading(false);
      }
    }, 5000);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [auth]);

  // EFECTO: Gestión del estado de conexión (Online/Ausente) según el estado de la App
  useEffect(() => {
    if (!user) return;

    const handleStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void actualizarEstadoConexion('online');
      } else if (nextState === 'background' || nextState === 'inactive') {
        void actualizarEstadoConexion('ausente');
      }
    };

    const sub = AppState.addEventListener('change', handleStateChange);
    return () => sub.remove();
  }, [user]);

  /**
   * MÉTODO: login
   * Autentica al usuario con email y contraseña.
   */
  const login = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error('Firebase no configurado (variables EXPO_PUBLIC_FIREBASE_*).');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    [auth],
  );

  /**
   * MÉTODO: register
   * Crea una nueva cuenta y envía el correo de verificación.
   */
  const register = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error('Firebase no configurado (variables EXPO_PUBLIC_FIREBASE_*).');
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
    },
    [auth],
  );

  /**
   * MÉTODO: refreshUser
   * Recarga los datos del usuario desde Firebase (útil después de verificar el email).
   */
  const refreshUser = useCallback(async () => {
    if (!auth?.currentUser) return;
    await reload(auth.currentUser);
    setUser({ ...auth.currentUser });
  }, [auth]);

  /**
   * MÉTODO: resetPassword
   * Envía un email de recuperación de contraseña.
   */
  const resetPassword = useCallback(
    async (email: string) => {
      if (!auth) throw new Error('Firebase no configurado.');
      await sendPasswordResetEmail(auth, email.trim());
    },
    [auth],
  );

  /**
   * MÉTODO: signInWithGoogle
   * Inicia sesión con la cuenta de Google (Web vs Nativo).
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        return;
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken || !auth) return;

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }, [auth]);

  /**
   * MÉTODO: linkGoogleAccount
   * Vincula una cuenta de Google a un usuario ya autenticado con email.
   */
  const linkGoogleAccount = useCallback(async () => {
    if (!auth?.currentUser) return;
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await linkWithCredential(auth.currentUser, provider as any);
        return;
      }
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) return;

      const credential = GoogleAuthProvider.credential(idToken);
      await linkWithCredential(auth.currentUser, credential);
      setUser({ ...auth.currentUser });
    } catch (error) {
      console.error('Google Link Error:', error);
      throw error;
    }
  }, [auth]);

  /**
   * MÉTODO: unlinkGoogleAccount
   * Desvincula Google de la cuenta actual.
   */
  const unlinkGoogleAccount = useCallback(async () => {
    if (!auth?.currentUser) return;
    try {
      await unlink(auth.currentUser, 'google.com');
      if (Platform.OS !== 'web') {
        await GoogleSignin.signOut();
      }
      setUser({ ...auth.currentUser });
    } catch (error) {
      console.error('Google Unlink Error:', error);
      throw error;
    }
  }, [auth]);

  /**
   * MÉTODO: changePassword
   * Actualiza la contraseña del usuario (requiere re-autenticación reciente).
   */
  const changePassword = useCallback(
    async (newPassword: string) => {
      if (!auth?.currentUser) return;
      await updatePassword(auth.currentUser, newPassword);
    },
    [auth],
  );

  /**
   * MÉTODO: reauthenticate
   * Solicita credenciales de nuevo para operaciones críticas.
   */
  const reauthenticate = useCallback(
    async (password?: string) => {
      const actual = auth?.currentUser;
      if (!actual) throw new Error('Sin sesión');
      // Con contraseña si entra con correo; si no, vuelve a pedir la cuenta de Google
      if (password && actual.email) {
        await reauthenticateWithCredential(actual, EmailAuthProvider.credential(actual.email, password));
        return;
      }
      if (Platform.OS === 'web') {
        await reauthenticateWithPopup(actual, new GoogleAuthProvider());
        return;
      }
      await GoogleSignin.hasPlayServices();
      const idToken = (await GoogleSignin.signIn()).data?.idToken;
      if (!idToken) throw new Error('Cancelado');
      await reauthenticateWithCredential(actual, GoogleAuthProvider.credential(idToken));
    },
    [auth],
  );

  /** Cambia el correo: Firebase envía un enlace al nuevo y solo lo cambia al confirmarlo. */
  const changeEmail = useCallback(
    async (nuevo: string) => {
      if (!auth?.currentUser) return;
      await verifyBeforeUpdateEmail(auth.currentUser, nuevo.trim());
    },
    [auth],
  );

  /** Último paso de borrar la cuenta: el usuario de Auth (requiere sesión reciente). */
  const deleteAuthUser = useCallback(async () => {
    if (!auth?.currentUser) return;
    await deleteUser(auth.currentUser);
    if (Platform.OS !== 'web') await GoogleSignin.signOut().catch(() => undefined);
  }, [auth]);

  /**
   * MÉTODO: logout
   * Cierra la sesión y actualiza el estado a 'offline'.
   */
  const logout = useCallback(async () => {
    if (!auth) return;
    try {
      await actualizarEstadoConexion('offline');
    } catch {
      // Ignorar fallo si ya se perdió la sesión
    }
    await signOut(auth);
  }, [auth]);

  const value = useMemo(
    () => ({
      user,
      loading,
      firebaseReady,
      login,
      signInWithGoogle,
      linkGoogleAccount,
      unlinkGoogleAccount,
      register,
      logout,
      refreshUser,
      resetPassword,
      changePassword,
      reauthenticate,
      changeEmail,
      deleteAuthUser,
    }),
    [
      user,
      loading,
      firebaseReady,
      login,
      signInWithGoogle,
      linkGoogleAccount,
      unlinkGoogleAccount,
      register,
      logout,
      refreshUser,
      resetPassword,
      changePassword,
      reauthenticate,
      changeEmail,
      deleteAuthUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para acceder fácilmente al contexto de autenticación.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
