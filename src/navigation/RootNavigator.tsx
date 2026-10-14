/**
 * ARCHIVO: navigation/RootNavigator.tsx
 * DESCRIPCIÓN: Controlador principal de la navegación de la aplicación.
 * Gestiona el enrutamiento dinámico basado en el estado de autenticación (Login vs App)
 * y la verificación del correo electrónico.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Cargando } from '../components/common/Cargando';

import { useAuth } from '../context/AuthContext';
import { ActorScreen } from '../screens/ActorScreen';
import { AjustesScreen } from '../screens/AjustesScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MainScreen } from '../screens/MainScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { BloqueadosScreen } from '../screens/BloqueadosScreen';
import { PrivacidadScreen } from '../screens/PrivacidadScreen';
import { CuentaScreen } from '../screens/CuentaScreen';
import { NotificacionesScreen } from '../screens/NotificacionesScreen';
import { PeliculaScreen } from '../screens/PeliculaScreen';
import { VerificationScreen } from '../screens/VerificationScreen';
import { ConversacionScreen } from '../screens/ConversacionScreen';
import { NuevoChatScreen } from '../screens/NuevoChatScreen';
import { InfoGrupoScreen } from '../screens/InfoGrupoScreen';
import { MovieMatchScreen } from '../screens/MovieMatchScreen';
import { MatchConfigScreen } from '../screens/MatchConfigScreen';
import { SolicitudesScreen } from '../screens/SolicitudesScreen';
import { BibliotecaAmigoScreen } from '../screens/BibliotecaAmigoScreen';
import { COLORS } from '../theme/colors';
import type { RootStackParamList } from './types';

// Stack nativo para transiciones fluidas entre pantallas
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * CONFIGURACIÓN DE DEEP LINKING:
 * Define cómo la app responde a URLs externas (ej: veoveo://movie/123).
 */
const linking = {
  // veoveotest:// es el esquema del APK de pruebas (app.config.js)
  prefixes: ['veoveo://', 'veoveotest://', 'https://veoveo.dripdev.dev'],
  config: {
    screens: {
      Main: 'main',
      Pelicula: 'movie/:movieId',
      Actor: 'actor/:actorId',
      Ajustes: 'ajustes',
      Perfil: 'perfil',
      // Al tocar un aviso: chat, Movie Match o solicitudes
      Conversacion: 'chat/:chatId',
      MovieMatch: 'match/:matchId',
      Solicitudes: 'solicitudes',
    },
  },
};

/**
 * COMPONENTE: RootNavigator
 * Es el cerebro de la navegación. Decide qué pantallas mostrar según:
 * 1. Si hay una sesión activa (Auth).
 * 2. Si el email está verificado (Security).
 */
export function RootNavigator() {
  const { user, loading } = useAuth();
  // Pantallas de detalle: la transición del sistema (entras «dentro»); la configuración del Match
  // sube como una hoja. Con reducir movimiento, todo con fundido.
  const reducir = useReducedMotion();
  const detalle = { animation: reducir ? ('fade' as const) : ('default' as const) };
  // La ficha entra con fundido: el movimiento lo pone el cartel que crece desde la lista (zoom)
  const ficha = { animation: 'fade' as const };
  const hoja = { animation: reducir ? ('fade' as const) : ('slide_from_bottom' as const) };

  return (
    <NavigationContainer linking={linking}>
      {loading ? (
        /* PANTALLA DE CARGA INICIAL: Previene parpadeos durante el chequeo de sesión */
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: COLORS.background,
          }}
        >
          <Cargando />
        </View>
      ) : (
        /* NAVEGACIÓN DINÁMICA CONDICIONAL */
        <Stack.Navigator
          key={user ? (user.emailVerified ? 'in' : 'ver') : 'out'}
          screenOptions={{ headerShown: false, animation: 'fade' }}
        >
          {user == null ? (
            /* FLUJO A: No autenticado (Auth Stack) */
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : !user.emailVerified ? (
            /* FLUJO B: Autenticado pero sin verificar email */
            <>
              <Stack.Screen name="Verification" component={VerificationScreen} />
            </>
          ) : (
            /* FLUJO C: Acceso total a la aplicación (App Stack) */
            <>
              <Stack.Screen name="Main" component={MainScreen} />
              <Stack.Screen name="Perfil" component={PerfilScreen} options={detalle} />
              <Stack.Screen name="Bloqueados" component={BloqueadosScreen} options={detalle} />
              <Stack.Screen name="Privacidad" component={PrivacidadScreen} options={detalle} />
              <Stack.Screen name="Cuenta" component={CuentaScreen} options={detalle} />
              <Stack.Screen
                name="Notificaciones"
                component={NotificacionesScreen}
                options={detalle}
              />
              <Stack.Screen name="Solicitudes" component={SolicitudesScreen} options={detalle} />
              <Stack.Screen
                name="BibliotecaAmigo"
                component={BibliotecaAmigoScreen}
                options={detalle}
              />
              <Stack.Screen name="Ajustes" component={AjustesScreen} options={detalle} />
              <Stack.Screen name="Actor" component={ActorScreen} options={detalle} />
              <Stack.Screen name="Pelicula" component={PeliculaScreen} options={ficha} />
              <Stack.Screen name="Conversacion" component={ConversacionScreen} options={detalle} />
              <Stack.Screen name="NuevoChat" component={NuevoChatScreen} options={detalle} />
              <Stack.Screen name="InfoGrupo" component={InfoGrupoScreen} options={detalle} />
              <Stack.Screen name="MovieMatch" component={MovieMatchScreen} />
              <Stack.Screen name="MatchConfig" component={MatchConfigScreen} options={hoja} />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
