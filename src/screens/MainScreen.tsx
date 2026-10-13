/**
 * ARCHIVO: screens/MainScreen.tsx
 * DESCRIPCIÓN: Contenedor principal con las pestañas Descubrir, Biblioteca y Social.
 * Muestra el splash mientras cargan las fuentes y gestiona el botón físico de retroceso.
 */

import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
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
import { ChatsTab } from './ChatsTab';
import { useChats } from '../context/ChatsContext';

const PESTANA = { descubrir: 0, biblioteca: 1, chats: 2, social: 3 } as const;

export function MainScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { fontFamily, loaded } = useMontserrat();
  const { noLeidos } = useChats();

  const [paginaActual, setPaginaActual] = useState<number>(PESTANA.descubrir);
  // La app se enseña en cuanto están las fuentes
  const [appReady, setAppReady] = useState(false);

  const isFocused = useIsFocused();
  const [userProfile, setUserProfile] = useState<{ fotoPerfil?: string | null }>({});

  // Refrescar la foto del perfil al volver a esta pantalla (por si se cambió en Perfil)
  useEffect(() => {
    if (isFocused && user) {
      void (async () => {
        const p = await obtenerPerfilUsuario();
        if (p) setUserProfile(p);
      })();
    }
  }, [isFocused, user]);

  // En la web, entrada de emergencia por si fallan las fuentes
  useEffect(() => {
    if (Platform.OS === 'web') {
      const emergencyTimer = setTimeout(() => setAppReady(true), 3500);
      return () => clearTimeout(emergencyTimer);
    }
  }, []);

  useEffect(() => {
    if (loaded) setAppReady(true);
  }, [loaded]);

  const [resetToken, setResetToken] = useState(0);
  const ff = useMemo(() => fontFamily ?? 'System', [fontFamily]);

  /** Cambia de pestaña. Si se pulsa la actual, vuelve arriba. */
  const handleTabPress = (index: number) => {
    if (paginaActual === index) {
      setResetToken((prev) => prev + 1);
    } else {
      setPaginaActual(index);
    }
  };

  /** Android: "atrás" vuelve a Descubrir antes de salir de la app. */
  useEffect(() => {
    if (!isFocused) return;
    const onBackPress = () => {
      if (paginaActual !== PESTANA.descubrir) {
        setPaginaActual(PESTANA.descubrir);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isFocused, paginaActual]);

  if (!appReady) return <SplashView fontFamily={ff} />;
  marcarHito('fin del splash');

  const navigatePelicula = (id: number) => {
    navigation.navigate('Pelicula', { movieId: id });
  };
  const navigateActor = (id: number, name: string) => {
    navigation.navigate('Actor', { actorId: id, actorName: name });
  };
  const userFoto = userProfile?.fotoPerfil || user?.photoURL;

  return (
    <LinearGradient colors={[GradientTop, GradientBottom]} style={styles.flex}>
      <View style={styles.flex}>
        {paginaActual === PESTANA.descubrir ? (
          <DiscoverTab
            fontFamily={ff}
            estaActiva
            resetToken={resetToken}
            onPeliculaClick={navigatePelicula}
            onActorClick={navigateActor}
            onPerfilClick={() => navigation.navigate('Perfil')}
            userFoto={userFoto}
          />
        ) : null}

        {paginaActual === PESTANA.biblioteca ? (
          <BibliotecaTab
            fontFamily={ff}
            resetToken={resetToken}
            onPeliculaClick={navigatePelicula}
            onPerfilClick={() => navigation.navigate('Perfil')}
            userFoto={userFoto}
          />
        ) : null}

        {paginaActual === PESTANA.chats ? (
          <ChatsTab
            onAbrirChat={(chatId) => navigation.navigate('Conversacion', { chatId })}
            onNuevoChat={() => navigation.navigate('NuevoChat')}
            onPerfilClick={() => navigation.navigate('Perfil')}
            userFoto={userFoto}
          />
        ) : null}

        {paginaActual === PESTANA.social ? (
          <SocialTab
            fontFamily={ff}
            onUsuarioClick={(uid) => {
              navigation.navigate('BibliotecaAmigo', { amigoUid: uid });
            }}
            onSolicitudesClick={() => navigation.navigate('Solicitudes')}
            onNuevoMatch={() => navigation.navigate('MatchConfig')}
            onAbrirMatch={(matchId) => navigation.navigate('MovieMatch', { matchId })}
            onPeliClick={navigatePelicula}
            onPerfilClick={() => navigation.navigate('Perfil')}
            userFoto={userFoto}
          />
        ) : null}
      </View>

      <LiquidBottomBar onTabChange={handleTabPress} paginaActual={paginaActual} noLeidos={noLeidos} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
