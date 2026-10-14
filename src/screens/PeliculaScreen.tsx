/**
 * ARCHIVO: screens/PeliculaScreen.tsx
 * DESCRIPCIÓN: Ficha detallada de una película.
 * Muestra información de TMDB (reparto, sinopsis, proveedores) y permite al usuario
 * interactuar con ella (añadir a 'Por Ver', marcar como 'Vista', valorar).
 * Utiliza efectos visuales de degradado y Blur para una estética 'Premium'.
 */

import React, { useState, useCallback } from 'react';
import { cargarPortada, type Portada } from '../storage/pruebasDiseno';
import { Image as ExpoImage } from 'expo-image';
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { posterUrl } from '../services/tmdbClient';
import { cargarPlataformas } from '../storage/preferences';

import { useAuth } from '../context/AuthContext';
import { useMontserrat } from '../theme/useMontserrat';
import type { RootStackParamList } from '../navigation/types';
import { GradientBottom } from '../theme/colors';

// Custom Hooks
import { useMovieData } from '../hooks/movie/useMovieData';
import { useUserMovieStatus } from '../hooks/movie/useUserMovieStatus';
import { fechaDeVista } from '../services/repositorioPeliculasUsuario';
import { Cargando } from '../components/common/Cargando';
import { shareMovie } from '../utils/shareUtils';

// Componentes Modulares
import { MovieHeader } from '../components/movie/MovieHeader';
import { MovieActions } from '../components/movie/MovieActions';
import { MovieRatingButton } from '../components/movie/MovieRatingButton';
import { MovieCast } from '../components/movie/MovieCast';
import { MovieProviders } from '../components/movie/MovieProviders';
import { CollectionSaga } from '../components/movie/CollectionSaga';
import { MovieRatingModal } from '../components/movie/MovieRatingModal';
import { MovieSocialProof } from '../components/movie/MovieSocialProof';
import { ZoomCartel } from '../components/movie/ZoomCartel';
import { origenDe, type Rect } from '../utils/zoomCartel';
import { useReducedMotion } from 'react-native-reanimated';

export function PeliculaScreen() {
  // Versión de la portada a prueba (Ajustes, solo en el APK de pruebas)
  const [portada, setPortada] = useState<Portada>('nitida');
  React.useEffect(() => {
    void cargarPortada().then(setPortada);
  }, []);
  const route = useRoute<RouteProp<RootStackParamList, 'Pelicula'>>();
  const { movieId } = route.params;
  const navigation = useNavigation<any>();

  // ── Zoom desde el cartel de la lista (ida) y de vuelta a su sitio (vuelta) ──
  const reducirMovimiento = useReducedMotion();
  const origenZoom = React.useMemo(
    () => (reducirMovimiento ? null : origenDe(movieId)),
    [movieId, reducirMovimiento],
  );
  const refCartel = React.useRef<View>(null);
  const desplazado = React.useRef(0);
  const yaSalimos = React.useRef(false);
  const idaHecha = React.useRef(false);
  const [zoom, setZoom] = useState<{ fase: 'ida' | 'vuelta'; destino: Rect } | null>(null);
  // El cartel de verdad no se ve mientras vuela la copia (ni antes de que salga, para no parpadear)
  const [cartelOculto, setCartelOculto] = useState(Boolean(origenZoom));
  const medirDestinoIda = useCallback(() => {
    if (!origenZoom || idaHecha.current) return;
    idaHecha.current = true;
    refCartel.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) setZoom({ fase: 'ida', destino: { x, y, width, height } });
    });
  }, [origenZoom]);
  // Al volver (botón o gesto atrás): el cartel se encoge hasta su sitio y luego se sale.
  // Si has bajado y el cartel ya no se ve, sale normal.
  React.useEffect(() => {
    if (!origenZoom) return undefined;
    return navigation.addListener('beforeRemove', (e: any) => {
      if (yaSalimos.current || desplazado.current > 40 || !refCartel.current) return;
      e.preventDefault();
      refCartel.current.measureInWindow((x, y, width, height) => {
        if (width <= 0) {
          yaSalimos.current = true;
          navigation.dispatch(e.data.action);
          return;
        }
        accionSalida.current = e.data.action;
        setCartelOculto(true);
        setZoom({ fase: 'vuelta', destino: { x, y, width, height } });
      });
    });
  }, [navigation, origenZoom]);
  const accionSalida = React.useRef<any>(null);
  const finZoom = useCallback(
    (fase: 'ida' | 'vuelta') => {
      if (fase === 'ida') {
        setCartelOculto(false);
        setZoom(null);
        return;
      }
      yaSalimos.current = true;
      if (accionSalida.current) navigation.dispatch(accionSalida.current);
    },
    [navigation],
  );
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fontFamily: ff } = useMontserrat();
  const fontFamily = ff || 'System';

  // HOOK: Obtiene datos técnicos de la película desde TMDB
  const {
    cargando,
    error: tmdbError,
    detalles,
    reparto,
    providers,
    coleccion,
    recargar,
  } = useMovieData(movieId);

  // HOOK: Verifica si el usuario ya tiene esta peli en su biblioteca y gestiona acciones
  const { peliculaBib, bibCargando, accionBib, userError, onPorVer, onMarcarVista, onQuitar } =
    useUserMovieStatus(movieId, detalles, providers?.results?.ES);

  const [descExp, setDescExp] = useState(false); // Control de expansión de sinopsis
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [misPlataformas, setMisPlataformas] = useState<number[]>([]);
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  // Sincronizamos las plataformas del usuario para marcar dónde puede verla
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const plots = await cargarPlataformas();
        setMisPlataformas(plots.map(Number));
      })();
    }, []),
  );

  React.useEffect(() => {
    setShowDeferredSections(false);
    const task = InteractionManager.runAfterInteractions(() => {
      setShowDeferredSections(true);
    });

    return () => {
      task.cancel();
    };
  }, [movieId]);

  const error = tmdbError || userError;

  // ESTADO DE CARGA LOGÍSTICA
  if (cargando && !detalles) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: GradientBottom }]}>
        <Cargando />
      </View>
    );
  }

  // MANEJO DE ERRORES (Red o API)
  if (error && !detalles) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: GradientBottom, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={64} color="rgba(255,255,255,0.2)" />
        <Text style={[styles.errTitle, { fontFamily }]}>¡Ups!</Text>
        <Text style={[styles.err, { fontFamily }]}>{error}</Text>
        {tmdbError && (
          <Pressable style={styles.errBtn} onPress={recargar}>
            <Text style={{ color: '#fff', fontFamily, fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        )}
        <Pressable style={styles.errBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontFamily, fontWeight: '700' }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (!detalles) return null;

  // Determina el icono y color de los botones de acción basados en el estado actual
  // 0: Nada, 1: Por Ver, 2: Vista
  const estadoPelicula = !peliculaBib ? 0 : peliculaBib.estado === 'por_ver' ? 1 : 2;

  return (
    <View style={[styles.flex, { backgroundColor: GradientBottom }]}>
      {/* 🖼️ FONDO: Poster desenfocado con gradiente envolvente */}
      {(detalles.backdrop_path || detalles.poster_path) && (
        <View style={styles.fixedBackdrop} pointerEvents="none">
          {/* Portada grande que cubre, en buena calidad. Se usa el CARTEL (vertical, hasta
              2000×3000), no el fondo apaisado: estirar el fondo w1280 a una caja alta lo
              ampliaba ×3 y se veía borroso. Dos versiones a prueba (Ajustes, solo pruebas):
              «nitida» = cartel original cubriendo arriba; «desenfocada» = cartel pequeño
              desenfocado cubriendo todo, con el cartel nítido de la tarjeta delante (pesa poco).
              Carga progresiva: la w342 se pinta al momento y la grande entra con un fundido. */}
          {detalles.poster_path && portada === 'desenfocada' ? (
            <>
              <ExpoImage
                source={{ uri: posterUrl(detalles.poster_path, 'w342')! }}
                blurRadius={40}
                contentFit="cover"
                cachePolicy="memory-disk"
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                colors={['rgba(2,6,23,0.45)', 'rgba(2,6,23,0.55)', GradientBottom]}
                locations={[0, 0.45, 0.9]}
                style={StyleSheet.absoluteFillObject}
              />
            </>
          ) : (
            <View
              style={
                detalles.poster_path
                  ? { width: '100%', height: 750 }
                  : { width: '100%', aspectRatio: 16 / 9 }
              }
            >
              <ExpoImage
                source={{
                  uri: detalles.poster_path
                    ? posterUrl(detalles.poster_path, 'original')!
                    : posterUrl(detalles.backdrop_path, 'w1280')!,
                }}
                placeholder={{
                  uri: posterUrl(detalles.poster_path || detalles.backdrop_path, 'w342')!,
                }}
                placeholderContentFit="cover"
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={300}
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                colors={[
                  'rgba(2,6,23,0.5)',
                  'rgba(0,0,0,0)',
                  'rgba(30,27,75,0.4)',
                  GradientBottom,
                  GradientBottom,
                ]}
                locations={[0, 0.2, 0.5, 0.8, 1]}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          )}
        </View>
      )}

      {/* 🧭 CABECERA DE NAVEGACIÓN (Floating) */}
      <View style={[styles.navHeader, { top: Math.max(insets.top, 12) + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.iconBtn}>
          <BlurView intensity={50} tint="dark" style={styles.blurBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </BlurView>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => shareMovie(movieId, detalles?.title || 'Película')}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <BlurView intensity={50} tint="dark" style={styles.blurBtn}>
              <Ionicons name="share-social-outline" size={22} color="#fff" />
            </BlurView>
          </Pressable>

          <Pressable onPress={() => navigation.popToTop()} hitSlop={12} style={styles.iconBtn}>
            <BlurView intensity={50} tint="dark" style={styles.blurBtn}>
              <Ionicons name="home-outline" size={22} color="#fff" />
            </BlurView>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={(e) => {
          desplazado.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={64}
      >
        {/* COMPONENTE: Título, Año, Duración y Logos de Streaming */}
        <MovieHeader
          detalles={detalles}
          fontFamily={fontFamily}
          misPlataformas={misPlataformas}
          providers={providers}
          refCartel={refCartel}
          ocultarCartel={cartelOculto}
          onCartelColocado={medirDestinoIda}
        />

        <View style={styles.body}>
          {/* BOTONES DE ACCIÓN: Por Ver / Vista */}
          <MovieActions
            user={user}
            estadoPelicula={estadoPelicula}
            accionBib={accionBib}
            bibCargando={bibCargando}
            onPorVer={onPorVer}
            onVista={() => (estadoPelicula === 2 ? onQuitar() : setShowRatingModal(true))}
            fontFamily={fontFamily}
          />

          {/* BOTÓN DE VALORACIÓN: Solo brilla si la película es 'Vista' */}
          <MovieRatingButton
            peliculaUsuario={peliculaBib}
            onPress={() => setShowRatingModal(true)}
            fontFamily={fontFamily}
          />

          {/* SOCIAL PROOF: ¿A qué otros amigos les gusta esta peli? */}
          {showDeferredSections ? (
            <MovieSocialProof movieId={movieId} fontFamily={fontFamily} />
          ) : null}

          <Text style={[styles.sectionTitle, { fontFamily }]}>Sinopsis</Text>
          <Text style={[styles.overview, { fontFamily }]} numberOfLines={descExp ? undefined : 3}>
            {detalles.overview || 'Sinopsis no disponible.'}
          </Text>
          {detalles.overview && detalles.overview.length > 150 && (
            <Pressable
              onPress={() => setDescExp(!descExp)}
              style={{ marginTop: -16, marginBottom: 24, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: '#38bdf8', fontWeight: '700', fontFamily }}>
                {descExp ? 'Ver menos' : '... Ver más'}
              </Text>
            </Pressable>
          )}

          {/* COMPONENTE: Carrusel de películas de la misma saga (si aplica) */}
          {showDeferredSections ? (
            <CollectionSaga
              coleccion={coleccion}
              fontFamily={fontFamily}
              onMovieClick={(id) => navigation.push('Pelicula', { movieId: id })}
            />
          ) : null}

          {/* COMPONENTE: Lista de actores (Reparto) */}
          {showDeferredSections ? (
            <MovieCast
              reparto={reparto}
              fontFamily={fontFamily}
              onActorClick={(id, name) =>
                navigation.navigate('Actor', { actorId: id, actorName: name })
              }
            />
          ) : null}

          {/* COMPONENTE: Todos los proveedores (Compra, Alquiler, Suscripción) */}
          {showDeferredSections ? (
            <MovieProviders providers={providers} fontFamily={fontFamily} />
          ) : null}
        </View>
      </ScrollView>

      {/* MODAL: Selector de estrellas para valorar la película */}
      <MovieRatingModal
        visible={showRatingModal}
        titulo={detalles.title}
        valorInicial={peliculaBib?.valoracion ?? 0}
        fechaInicial={peliculaBib?.estado === 'vista' ? fechaDeVista(peliculaBib) : undefined}
        fontFamily={fontFamily}
        onClose={() => setShowRatingModal(false)}
        onGuardar={(v, fecha) => {
          setShowRatingModal(false);
          void onMarcarVista(v, fecha);
        }}
      />

      {/* Copia del cartel volando entre la lista y la cabecera (ida y vuelta) */}
      {origenZoom && zoom ? (
        <ZoomCartel
          origen={origenZoom.rect}
          destino={zoom.destino}
          poster={origenZoom.poster}
          fase={zoom.fase}
          onFin={finZoom}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  navHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: { width: 44, height: 44 },
  blurBtn: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { paddingHorizontal: 20 },
  fixedBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 16,
  },
  overview: { color: '#cbd5e1', fontSize: 15, lineHeight: 24, marginBottom: 24 },
  errTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 16 },
  err: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8, fontSize: 16 },
  errBtn: {
    marginTop: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
  },
});
