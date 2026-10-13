/**
 * ARCHIVO: App.tsx
 * DESCRIPCIÓN: Punto de entrada principal de la aplicación VeoVeo.
 * Se encarga de la configuración global, carga de fuentes, estilos web,
 * el escudo de versiones y la jerarquía de proveedores (Context Providers).
 */

import { QueryClient, type Query } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';

import { AuthProvider } from './context/AuthContext';
import { BibliotecaProvider } from './context/BibliotecaContext';
import { ChatsProvider } from './context/ChatsContext';
import { LanguageProvider } from './context/LanguageContext';
import { RootNavigator } from './navigation/RootNavigator';
import { abrirEnlaceAviso } from './utils/enlaces';
import { COLORS } from './theme/colors';
import { getFirestoreDb } from './services/firebase';
import { observarConfiguracionApp } from './services/repositorioConfiguracion';
import { guardarPushToken } from './services/repositorioUsuarios';
import { ensureNotificationChannelConfigured } from './services/notificationService';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import { InAppNotificationBanner } from './components/InAppNotificationBanner';
import { AvisoSinConexion } from './components/common/AvisoSinConexion';
import { olvidarPreferenciaAdulto } from './storage/preferences';
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt';

import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

// 🛑 CONFIGURACIÓN DE ACCESIBILIDAD: Cap global de escalado de fuentes
// Evita que configuraciones externas del sistema rompan los layouts de la app.
if ((Text as any).defaultProps) {
  (Text as any).defaultProps.maxFontSizeMultiplier = 1.3;
} else {
  (Text as any).defaultProps = { maxFontSizeMultiplier: 1.3 };
}
if ((TextInput as any).defaultProps) {
  (TextInput as any).defaultProps.maxFontSizeMultiplier = 1.3;
} else {
  (TextInput as any).defaultProps = { maxFontSizeMultiplier: 1.3 };
}

// Cliente para React Query. Lo que se marca con `meta: { persistir: true }` (datos de TMDB)
// se guarda en el móvil durante un día, para que un arranque en frío pinte al momento.
const UN_DIA = 1000 * 60 * 60 * 24;
const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: UN_DIA } },
});
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'veoveo-cache-consultas',
});
const persistOptions = {
  persister,
  maxAge: UN_DIA,
  buster: Constants.expoConfig?.version ?? '0',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === 'success' && query.meta?.persistir === true,
  },
};

function compareVersions(v1: string, v2: string) {
  const p1 = v1.split('.').map((value) => parseInt(value.replace(/[^0-9]/g, ''), 10) || 0);
  const p2 = v2.split('.').map((value) => parseInt(value.replace(/[^0-9]/g, ''), 10) || 0);

  for (let i = 0; i < Math.max(p1.length, p2.length); i += 1) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;

    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }

  return 0;
}

/**
 * COMPONENTE: VersionShield
 * PROPÓSITO: Detecta si existe una versión mínima requerida en Firebase
 * y bloquea la app si el usuario necesita actualizar.
 */
function VersionShield() {
  const [needsUpdate, setNeedsUpdate] = React.useState(false);
  // La versión de Google Play solo se actualiza desde Play (política de Play): el enlace de
  // descarga de Firestore queda para el APK de pruebas.
  const [downloadUrl, setDownloadUrl] = React.useState('https://play.google.com/store/apps/details?id=com.roblesgg.veoveo');
  const [releaseTitle, setReleaseTitle] = React.useState('Nueva versión disponible');
  const [releaseBody, setReleaseBody] = React.useState(
    'Hemos lanzado mejoras críticas. Actualiza ahora para seguir disfrutando de VeoVeo en la versión más reciente.',
  );
  const lastNotifiedVersion = React.useRef<string | null>(null);

  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const isTest = Constants.expoConfig?.name?.includes('Test') ?? false;

  React.useEffect(() => {
    if (Platform.OS === 'web' || !getFirestoreDb()) return undefined;

    // Configuración global 'configuracion/app', que actualiza el script push-version.mjs
    return observarConfiguracionApp((data) => {
      const findValue = (prefix: string) => {
        const key = Object.keys(data).find((k) => k.trim() === prefix);
        return key ? data[key] : null;
      };

      // Campo de versión mínima según si es build de test o producción
      const minVersionName = findValue(isTest ? 'min_version_test' : 'min_version');
      const nextDownloadUrl = findValue(isTest ? 'download_url_test' : 'download_url');
      const rTitle = findValue('release_title');
      const rBody = findValue('release_body');
      if (rTitle) setReleaseTitle(String(rTitle));
      if (rBody) setReleaseBody(String(rBody));

      // Si la versión instalada es inferior a la requerida, se activa el escudo
      const updateNeeded =
        minVersionName && compareVersions(currentVersion, String(minVersionName).trim()) === -1;
      setNeedsUpdate(Boolean(updateNeeded));

      if (nextDownloadUrl && isTest) setDownloadUrl(String(nextDownloadUrl).trim());

      if (updateNeeded && lastNotifiedVersion.current !== String(minVersionName).trim()) {
        lastNotifiedVersion.current = String(minVersionName).trim();
        void Notifications.scheduleNotificationAsync({
          content: {
            title: 'Nueva actualización disponible',
            body: `VeoVeo ${String(minVersionName).trim()} ya está lista para descargar.`,
            sound: 'default',
            data: { url: (isTest && nextDownloadUrl) || downloadUrl },
          },
          trigger: null,
        });
      }
    });
  }, [currentVersion, downloadUrl, isTest]);

  if (Platform.OS === 'web' || !needsUpdate) return null;

  return (
    <View style={styles.updateContainer}>
      <BlurView intensity={30} tint="dark" style={styles.updateBtnContainer}>
        <Text style={styles.updateEmoji}>🚀</Text>
        <Text style={styles.updateTitle}>{releaseTitle}</Text>
        <Text style={styles.updateText}>{releaseBody}</Text>
        <Text
          style={styles.updateBtn}
          onPress={() => {
            void Linking.openURL(downloadUrl);
          }}
        >
          Actualizar ahora
        </Text>
      </BlurView>
    </View>
  );
}

/**
 * COMPONENTE PRINCIPAL: App
 * Integra todos los proveedores de contexto y la navegación raíz.
 */
export default function App() {
  React.useEffect(() => {
    void olvidarPreferenciaAdulto();
  }, []);
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  const [inAppNotif, setInAppNotif] = React.useState<{
    title: string;
    body: string;
    url?: string;
  } | null>(null);

  const handleTokenRegistered = React.useCallback((token: string) => {
    void guardarPushToken(token).catch(() => {});
  }, []);

  // EFECTO: Configuración Visual específica para WEB
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const head = document.head;

      // Inyección de Google Fonts (Montserrat) para una estética Premium
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href =
        'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap';
      head.appendChild(fontLink);

      // Polofill de fuentes de iconos para que se vean correctamente en el navegador
      const iconStyle = document.createElement('style');
      iconStyle.innerHTML = `
         @font-face {
           font-family: 'Ionicons';
           src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
           font-display: block;
         }
         @font-face {
           font-family: 'MaterialCommunityIcons';
           src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
           font-display: block;
         }
         @font-face {
           font-family: 'MaterialIcons';
           src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
           font-display: block;
         }
         [data-contents="true"], .rn-view, .rn-text {
           font-family: 'Montserrat', sans-serif;
         }
         [style*="font-family: Ionicons"], [style*="font-family: 'Ionicons'"], [data-icon] {
           font-family: 'Ionicons' !important;
         }
         [style*="font-family: MaterialCommunityIcons"], [style*="font-family: 'MaterialCommunityIcons'"] {
           font-family: 'MaterialCommunityIcons' !important;
         }
       `;
      head.appendChild(iconStyle);

      // Estilos globales de CSS para limpiar la UI web (scrollbars, backgrounds radiales)
      const style = document.createElement('style');
      style.innerHTML = `
         * {
           outline: none;
           -webkit-tap-highlight-color: transparent;
           user-select: none;
         }
         body {
           background-color: #020617;
           margin: 0;
           padding: 0;
           overflow-x: hidden;
           font-family: 'Montserrat', sans-serif !important;
         }
         /* Scrollbars elegantes estilo Apple */
         ::-webkit-scrollbar { width: 0px; height: 0px; background: transparent; }
         input, textarea { user-select: auto !important; }
         #root {
           background: radial-gradient(circle at center, #1e1b4b 0%, #020617 100%);
           height: 100dvh;
           position: fixed;
           top: 0; left: 0; right: 0; bottom: 0;
           overflow-y: auto;
         }
       `;
      head.appendChild(style);
    }
  }, []);

  // EFECTO: Listeners de notificaciones push
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    void ensureNotificationChannelConfigured();

    // Notificación recibida con la app ABIERTA → muestra banner in-app
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      setInAppNotif({
        title: title ?? 'VeoVeo',
        body: body ?? '',
        url: typeof data?.url === 'string' ? data.url : undefined,
      });
    });

    // Usuario toca la notificación desde bandeja (app en fondo o cerrada)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.length > 0) abrirEnlaceAviso(url);
    });

    // App abierta pulsando una notificación desde estado completamente cerrado
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.length > 0) abrirEnlaceAviso(url);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  // RENDER: Arbol de componentes con proveedores de contexto
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LanguageProvider>
          <AuthProvider>
            <BibliotecaProvider>
            <ChatsProvider>
              <View style={styles.appWrapper}>
                <View style={styles.mainContainer}>
                  <RootNavigator />
                  <AvisoSinConexion />
                  <VersionShield />
                  <IOSInstallPrompt />
                  <NotificationPermissionPrompt onTokenRegistered={handleTokenRegistered} />
                  {inAppNotif && (
                    <InAppNotificationBanner
                      title={inAppNotif.title}
                      body={inAppNotif.body}
                      url={inAppNotif.url}
                      onDismiss={() => setInAppNotif(null)}
                    />
                  )}
                </View>
              </View>
            </ChatsProvider>
            </BibliotecaProvider>
          </AuthProvider>
        </LanguageProvider>
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  );
}

// ESTILOS: Configuración visual global
const styles = StyleSheet.create({
  // Estilos visuales del escudo de actualización
  updateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  updateEmoji: { fontSize: 60, marginBottom: 20 },
  updateTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  updateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  updateBtnContainer: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  updateBtn: {
    backgroundColor: COLORS.primary,
    color: '#fff',
    paddingVertical: 18,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    borderRadius: 20,
  },
  appWrapper: {
    flex: 1,
    backgroundColor: '#020617',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: 'radial-gradient(circle at center, #1e1b4b 0%, #020617 100%)',
        }
      : {}),
  },
  mainContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
});
