/**
 * ARCHIVO: screens/MainScreen.tsx
 * DESCRIPCIÓN: Contenedor principal de la aplicación que gestiona las pestañas (Tabs).
 * Incluye la lógica de navegación entre Descubrir, Biblioteca, Tier Lists y Social.
 * Implementa una pantalla de Splash personalizada y gestiona el botón físico de retroceso.
 */

import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidBottomBar } from '../components/LiquidBottomBar';
import type { RootStackParamList } from '../navigation/types';
import { GradientBottom, GradientTop } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { obtenerPerfilUsuario } from '../services/repositorioUsuarios';
import { useMontserrat } from '../theme/useMontserrat';
import { SplashView } from '../components/SplashView';
import { marcarHito } from '../utils/medicionArranque';
import { BibliotecaTab } from './BibliotecaTab';
import { DiscoverTab } from './DiscoverTab';
import { SocialTab } from './SocialTab';
import { TierListsTab } from './TierListsTab';

export function MainScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { fontFamily, loaded } = useMontserrat();

  // ESTADO: Pestaña actualmente seleccionada (0: Discover, 1: Biblioteca, 2: TierLists, 3: Social)
  const [paginaActual, setPaginaActual] = useState(0);
  
  // ESTADO: Gestión interna de sub-pantallas para Tier Lists
  const [pantallaTierList, setPantallaTierList] = useState(0);
  
  // ESTADO: Indica si la app ha pasado la pantalla de carga (Splash)
  const [appReady, setAppReady] = useState(false);

  const isFocused = useIsFocused();
  const [userProfile, setUserProfile] = useState<{ fotoPerfil?: string | null }>({});

  // EFECTO: Refrescar el perfil del usuario cada vez que la pantalla gana foco
  useEffect(() => {
    if (isFocused && user) {
      void (async () => {
        const p = await obtenerPerfilUsuario();
        if (p) setUserProfile(p);
      })();
    }
  }, [isFocused, user]);

  /** 🕒 GESTIÓN DE CARGA (Splash):
   * En Web, forzamos la entrada después de un tiempo de seguridad por si fallan las fuentes.
   */
  useEffect(() => {
    if (Platform.OS === 'web') {
      const emergencyTimer = setTimeout(() => setAppReady(true), 3500);
      return () => clearTimeout(emergencyTimer);
    }
  }, []);

  /** EFECTO: Transición de Splash a App una vez cargado el diseño. */
  useEffect(() => {
    if (loaded) {
      const timer = setTimeout(() => setAppReady(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  const [resetToken, setResetToken] = useState(0);
  const ff = useMemo(() => fontFamily ?? 'System', [fontFamily]);

  /** Maneja el cambio de pestaña. Si se pulsa la pestaña actual, dispara un reset (scroll al top). */
  const handleTabPress = (index: number) => {
    if (paginaActual === index) {
      setResetToken((prev) => prev + 1);
    } else {
      setPaginaActual(index);
    }
  };

  /** 🛡️ GESTIÓN DE RETROCESO (Android):
   * Controla que al pulsar 'atrás' se regrese a la Home antes de salir de la app.
   */
  useEffect(() => {
    if (!isFocused) return;
    const onBackPress = () => {
      // Si estamos en TierLists y no en la principal, volvemos un paso atrás en TierLists
      if (paginaActual === 2 && pantallaTierList !== 0) {
        setPantallaTierList(pantallaTierList === 1 || pantallaTierList === 2 ? 0 : 1);
        return true;
      }
      // Si estamos en otra pestaña, volvemos a la Home (Discover)
      if (paginaActual !== 0) {
        setPaginaActual(0);
        return true;
      }
      return false; // Salir de la app
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isFocused, paginaActual, pantallaTierList]);

  // Pantalla de carga mientras se inicializa la UI Premium
  if (!appReady) return <SplashView fontFamily={ff} />;
  marcarHito('fin del splash');

  // Ocultar barra de navegación si estamos editando una Tier List
  const showBottomBar = !(paginaActual === 2 && pantallaTierList !== 0);

  // Navegación rápida centralizada
  const navigatePelicula = (id: number) => {
    navigation.navigate('Pelicula', { movieId: id });
  };
  const navigateActor = (id: number, name: string) => {
    navigation.navigate('Actor', { actorId: id, actorName: name });
  };

  return (
    <LinearGradient colors={[GradientTop, GradientBottom]} style={styles.flex}>
      <View style={styles.flex}>
        {/* RENDER CONDICIONAL DE PESTAÑAS (Para optimizar memoria) */}
        
        {paginaActual === 0 ? (
          <DiscoverTab
            fontFamily={ff}
            estaActiva
            resetToken={resetToken}
            onPeliculaClick={navigatePelicula}
            onActorClick={navigateActor}
            onPerfilClick={() => navigation.navigate('Perfil')}
            userFoto={userProfile?.fotoPerfil || user?.photoURL}
          />
        ) : null}

        {paginaActual === 1 ? (
          <BibliotecaTab
            fontFamily={ff}
            resetToken={resetToken}
            onPeliculaClick={navigatePelicula}
            onPerfilClick={() => navigation.navigate('Perfil')}
            userFoto={userProfile?.fotoPerfil || user?.photoURL}
          />
        ) : null}

        {paginaActual === 2 ? (
          <TierListsTab
            fontFamily={ff}
            pantalla={pantallaTierList}
            onPantallaChange={setPantallaTierList}
            onPeliculaClick={navigatePelicula}
            onPerfilClick={() => navigation.navigate('Perfil')}
            userFoto={userProfile?.fotoPerfil || user?.photoURL}
          />
        ) : null}

        {paginaActual === 3 ? (
          <SocialTab
            fontFamily={ff}
            onUsuarioClick={(uid) => {
              navigation.navigate('BibliotecaAmigo', { amigoUid: uid });
            }}
            onSolicitudesClick={() => navigation.navigate('Solicitudes')}
            onChatClick={(chatId, participants, chatName) => navigation.navigate('ChatDetail', { chatId, participants, chatName })}
            onPerfilClick={() => navigation.navigate('Perfil')}
            userFoto={userProfile?.fotoPerfil || user?.photoURL}
          />
        ) : null}
      </View>

      {/* BARRA DE NAVEGACIÓN LÍQUIDA (PERSONALIZADA) */}
      {showBottomBar ? (
        <LiquidBottomBar onTabChange={handleTabPress} paginaActual={paginaActual} />
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
