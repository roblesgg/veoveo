/**
 * ARCHIVO: navigation/RootNavigator.tsx
 * DESCRIPCIÓN: Controlador principal de la navegación de la aplicación.
 * Gestiona el enrutamiento dinámico basado en el estado de autenticación (Login vs App)
 * y la verificación del correo electrónico.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';

import { useAuth } from '../context/AuthContext';
import { ActorScreen } from '../screens/ActorScreen';
import { AjustesScreen } from '../screens/AjustesScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MainScreen } from '../screens/MainScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { BloqueadosScreen } from '../screens/BloqueadosScreen';
import { PeliculaScreen } from '../screens/PeliculaScreen';
import { VerificationScreen } from '../screens/VerificationScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
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
  prefixes: ['veoveo://', 'https://veoveo.dripdev.dev'],
  config: {
    screens: {
      Main: 'main',
      Pelicula: 'movie/:movieId',
      Actor: 'actor/:actorId',
      Ajustes: 'ajustes',
      Perfil: 'perfil',
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
          <LoaderClaqueta />
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
              <Stack.Screen name="Perfil" component={PerfilScreen} />
              <Stack.Screen name="Bloqueados" component={BloqueadosScreen} />
              <Stack.Screen name="Solicitudes" component={SolicitudesScreen} />
              <Stack.Screen name="BibliotecaAmigo" component={BibliotecaAmigoScreen} />
              <Stack.Screen name="Ajustes" component={AjustesScreen} />
              <Stack.Screen name="Actor" component={ActorScreen} />
              <Stack.Screen name="Pelicula" component={PeliculaScreen} />
              <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
              <Stack.Screen name="MovieMatch" component={MovieMatchScreen} />
              <Stack.Screen name="MatchConfig" component={MatchConfigScreen} />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
