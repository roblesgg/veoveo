import { avatarUrl } from '../utils/imagenes';
/**
 * ARCHIVO: screens/DiscoverTab.tsx
 * DESCRIPCIÓN: Pestaña 'Descubrir'. Es el motor central de contenido de la app.
 * Presenta carruseles dinámicos de películas, sistema de búsqueda global de cine/actores
 * y personalización de la Home mediante drag & drop de categorías.
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState, useRef, memo, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Keyboard,
  BackHandler,
  type ViewToken,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useRecargaCarruseles } from '../hooks/useDescubrir';
import { useDiscoverSearch } from '../hooks/useDiscoverSearch';
import { posterUrl, profileUrl } from '../services/tmdbClient';
import { RatingBadge } from '../components/RatingBadge';
import { useBiblioteca } from '../context/BibliotecaContext';
import {
  cargarCarruselesActivos,
  guardarCarruselesActivos,
  cargarPlataformas,
} from '../storage/preferences';
import { COLORS, CardSurface } from '../theme/colors';
import { SHADOWS } from '../theme/theme';

import { CarruselPeliculas } from '../components/discover/CarruselPeliculas';
import { CategoryModal } from '../components/discover/CategoryModal';
import { EstadoError, EstadoVacio } from '../components/common/EstadoPantalla';
import { useLanguage } from '../context/LanguageContext';

/**
 * 🚀 [MEMO] Item de Película para la Grilla de Búsqueda.
 * Optimizado para renderizar cientos de resultados sin lag.
 */
const MovieResultItem = memo(
  ({ item, onPeliculaClick, libraryMap }: { item: any; onPeliculaClick: any; libraryMap: any }) => (
    <View style={styles.movieGridItem}>
      <Pressable
        onPress={() => onPeliculaClick(item.id)}
        style={[styles.resultCard, SHADOWS.macLight]}
      >
        <ExpoImage
          source={{ uri: posterUrl(item.poster_path, 'w342')! }}
          style={styles.fullImg}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={String(item.id)}
          transition={200}
        />
        {/* Badge de estado: Indica si ya la hemos visto o está en 'Por ver' */}
        {libraryMap[item.id]?.estado === 'vista' ? (
          <RatingBadge rating={libraryMap[item.id].valoracion} hideText />
        ) : libraryMap[item.id]?.estado === 'por_ver' ? (
          <View style={styles.eyeBadge}>
            <Ionicons name="eye" size={14} color="#3498db" />
          </View>
        ) : null}
      </Pressable>
    </View>
  ),
);
MovieResultItem.displayName = 'MovieResultItem';

/**
 * 🚀 [MEMO] Item de Actor para la Grilla de Búsqueda.
 */
const ActorResultItem = memo(({ item, onActorClick }: { item: any; onActorClick: any }) => (
  <View style={styles.actorGridItem}>
    <Pressable
      onPress={() => onActorClick(item.id, item.name)}
      style={[styles.resultCard, SHADOWS.macLight]}
    >
      <ExpoImage
        source={{ uri: profileUrl(item.profile_path, 'h632')! }}
        style={styles.fullImg}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={String(item.id)}
        transition={200}
      />
      <Text style={styles.actorName} numberOfLines={1}>
        {item.name}
      </Text>
    </Pressable>
  </View>
));
ActorResultItem.displayName = 'ActorResultItem';

/**
 * COMPONENTE: DiscoverTab
 */
/** Un carrusel cuenta como visto si lleva medio segundo con la mitad en pantalla. */
const VISIBILIDAD_CARRUSEL = { itemVisiblePercentThreshold: 50, minimumViewTime: 500 };

export function DiscoverTab({
  fontFamily,
  estaActiva,
  onPeliculaClick,
  onActorClick,
  onPerfilClick,
  userFoto,
  resetToken = 0,
}: {
  fontFamily: string;
  estaActiva: boolean;
  onPeliculaClick: (movieId: number) => void;
  onActorClick: (actorId: number, actorName: string) => void;
  onPerfilClick?: () => void;
  userFoto?: string | null;
  resetToken?: number;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { useAuth: useAuthLocal } = require('../context/AuthContext');
  const { user } = useAuthLocal();

  const mainListRef = useRef<any>(null);
  const [carruselesEnPantalla, setCarruselesEnPantalla] = useState<Set<string>>(new Set());
  const alCambiarVisibles = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) =>
    setCarruselesEnPantalla(new Set(viewableItems.map((v) => String(v.item)))),
  );
  const searchInputRef = useRef<TextInput>(null);

  // Mapa [id_pelicula]: {estado, valoracion} para pintar los iconos de los pósters
  const { mapa: libraryMap } = useBiblioteca();

  // ESTADO: Configuración de la Home
  const [carruselesActivos, setCarruselesActivos] = useState<string[]>([]);
  const [buscarAtiva, setBuscarAtiva] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mostrarDialogo, setMostrarDialogo] = useState(false);
  const [misPlataformas, setMisPlataformas] = useState<number[]>([]);

  // Cada carrusel carga sus datos al montarse; aquí solo la recarga global
  const { cargando, recargarTodos } = useRecargaCarruseles();

  // HOOK: Lógica de búsqueda interactiva
  const {
    textoBuscar,
    setTextoBuscar,
    resultadosBusqueda,
    buscando,
    error: errorBusqueda,
    reintentar: reintentarBusqueda,
    sinResultados,
    tipoBusqueda,
    setTipoBusqueda,
  } = useDiscoverSearch();

  // EFECTO: Cargar configuración personalizada de carruseles del usuario
  useEffect(() => {
    void cargarCarruselesActivos().then(setCarruselesActivos);
  }, []);

  // EFECTO: Cargar plataformas de streaming preferidas para filtrar logos
  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const plots = await cargarPlataformas();
        setMisPlataformas(plots.map(Number));
      })();
    }, []),
  );

  /** Guarda permanentemente el orden y visibilidad de los carruseles */
  const persistCarruseles = useCallback(
    (next: string[]) => {
      setCarruselesActivos(next);
      void guardarCarruselesActivos(next);
      if (user) {
        void require('../services/userPreferences').guardarPreferenciaFirestore(
          user.uid,
          'carruseles',
          next,
        );
      }
    },
    [user],
  );

  /** Activa/Desactiva el modo búsqueda con enfoque automático del input */
  const toggleSearch = () => {
    const newState = !buscarAtiva;
    setBuscarAtiva(newState);
    if (newState) setTimeout(() => searchInputRef.current?.focus(), 100);
    else Keyboard.dismiss();
  };

  /** Gestiona el retroceso para cerrar la búsqueda antes que la app */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (buscarAtiva || textoBuscar.length >= 2) {
          setTextoBuscar('');
          setBuscarAtiva(false);
          Keyboard.dismiss();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [buscarAtiva, textoBuscar]),
  );

  return (
    <View style={styles.flex}>
      {/* 🔮 CABECERA PREMIUM: Efecto Glassmorphism con Blur dinámico */}
      <BlurView
        intensity={85}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.headerContainer, { height: insets.top + (buscarAtiva ? 220 : 80) }]}
      />
      <View
        style={[
          styles.headerContainer,
          {
            height: insets.top + (buscarAtiva ? 220 : 80),
            backgroundColor: 'rgba(15, 23, 42, 0.12)',
          },
        ]}
      >
        <View style={styles.headerBorder} />
        <View style={[styles.headerRow, { top: Math.max(insets.top, 12) + 12 }]}>
          <Text style={[styles.titulo, { fontFamily, flex: 1 }]}>Explorar</Text>
          <View style={styles.actionsTopRow}>
            {/* HERRAMIENTAS DE EDICIÓN (Sort & Add) */}
            {modoEdicion && (
              <Pressable onPress={() => setMostrarDialogo(true)} style={styles.iconBtn}>
                <Ionicons name="add-circle" size={32} color={COLORS.primary} />
              </Pressable>
            )}
            <Pressable onPress={() => setModoEdicion(!modoEdicion)} style={styles.iconBtn}>
              <Ionicons
                name={modoEdicion ? 'checkmark-circle' : 'create-outline'}
                size={26}
                color="#fff"
              />
            </Pressable>
            <Pressable onPress={toggleSearch} style={styles.iconBtn}>
              <Ionicons name="search-outline" size={28} color="#fff" />
            </Pressable>
            <Pressable onPress={() => onPerfilClick?.()} style={styles.perfilBtnMini}>
              <View style={styles.perfilInnerMini}>
                {userFoto ? (
                  <ExpoImage
                    source={{ uri: avatarUrl(userFoto, 44)! }}
                    style={styles.perfilFotoMini}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                ) : (
                  <Ionicons name="person" size={22} color="#fff" />
                )}
              </View>
            </Pressable>
          </View>
        </View>

        {/* ÁREA DE BÚSQUEDA DINÁMICA */}
        {buscarAtiva && (
          <Animated.View
            entering={FadeInDown}
            style={[styles.searchArea, { top: Math.max(insets.top, 12) + 80 }]}
          >
            <View style={[styles.searchField, SHADOWS.macLight]}>
              <TextInput
                ref={searchInputRef}
                value={textoBuscar}
                onChangeText={setTextoBuscar}
                placeholder={tipoBusqueda === 'movie' ? 'Buscar películas...' : 'Buscar actores...'}
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={{ flex: 1, color: '#fff', fontFamily }}
              />
              {textoBuscar.length > 0 && (
                <Pressable onPress={() => setTextoBuscar('')} style={styles.clearBtn} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
                </Pressable>
              )}
            </View>
            <View style={styles.typeSelector}>
              <Pressable
                onPress={() => setTipoBusqueda('movie')}
                style={[styles.typeBtn, tipoBusqueda === 'movie' && styles.typeBtnActive]}
              >
                <Text style={[styles.typeBtnText, tipoBusqueda === 'movie' && { color: '#000' }]}>
                  Películas
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTipoBusqueda('person')}
                style={[styles.typeBtn, tipoBusqueda === 'person' && styles.typeBtnActive]}
              >
                <Text style={[styles.typeBtnText, tipoBusqueda === 'person' && { color: '#000' }]}>
                  Actores
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>

      {/* 📦 LISTADO DE CONTENIDO (PANTALLA PRINCIPAL) */}
      <View style={styles.content}>
        <View style={styles.webCenteringWrapper}>
          {modoEdicion ? (
            /* MODO EDICIÓN: Lista interactiva para reordenar carruseles */
            <DraggableFlatList
              data={carruselesActivos}
              keyExtractor={(item) => item}
              onDragEnd={({ data }) => persistCarruseles(data)}
              renderItem={(params) => (
                <ScaleDecorator>
                  <CarruselPeliculas
                    id={params.item}
                    drag={params.drag}
                    isActive={params.isActive}
                    modoEdicion
                    fontFamily={fontFamily}
                    onPeliculaClick={onPeliculaClick}
                    onEliminar={() =>
                      persistCarruseles(carruselesActivos.filter((c) => c !== params.item))
                    }
                    misPlataformas={misPlataformas}
                    libraryMap={libraryMap}
                  />
                </ScaleDecorator>
              )}
              contentContainerStyle={{
                paddingTop: insets.top + (buscarAtiva ? 230 : 90),
                paddingBottom: 140,
              }}
            />
          ) : (
            /* MODO EXPLORACIÓN: Lista optimizada de carruseles con carga bajo demanda */
            <FlatList
              ref={mainListRef}
              data={carruselesActivos}
              keyExtractor={(item) => item}
              // Solo se montan (y piden datos) los carruseles visibles y el siguiente
              initialNumToRender={3}
              maxToRenderPerBatch={2}
              windowSize={3}
              // Qué carruseles llevan medio segundo en pantalla (para pedir plataformas solo de esos)
              onViewableItemsChanged={alCambiarVisibles.current}
              viewabilityConfig={VISIBILIDAD_CARRUSEL}
              renderItem={({ item }) => (
                <CarruselPeliculas
                  id={item}
                  enPantalla={carruselesEnPantalla.has(item)}
                  onPeliculaClick={onPeliculaClick}
                  misPlataformas={misPlataformas}
                  fontFamily={fontFamily}
                  modoEdicion={false}
                  onEliminar={() => {}}
                  drag={() => {}}
                  isActive={false}
                  libraryMap={libraryMap}
                />
              )}
              refreshControl={
                <RefreshControl
                  refreshing={cargando}
                  onRefresh={recargarTodos}
                  tintColor="#fff"
                  progressViewOffset={100}
                />
              }
              contentContainerStyle={{
                paddingTop: insets.top + (buscarAtiva ? 230 : 90),
                paddingBottom: 140,
              }}
              keyboardDismissMode="on-drag"
            />
          )}
        </View>
      </View>

      {/* 🔍 CAPA DE RESULTADOS DE BÚSQUEDA (Overlay) */}
      {(buscarAtiva || textoBuscar.length >= 2) && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 1200 }]}
          onPress={() => {
            setBuscarAtiva(false);
            Keyboard.dismiss();
          }}
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
      )}

      {/* Renderizado de la grilla de búsqueda al escribir */}
      {textoBuscar.length >= 2 && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.busquedaBox, { top: 0 }]}>
          {buscando ? (
            <ActivityIndicator color="#fff" style={{ marginTop: insets.top + 140 }} />
          ) : errorBusqueda ? (
            <View style={{ marginTop: insets.top + 140 }}>
              <EstadoError
                texto="No hemos podido buscar. Revisa la conexión."
                onReintentar={reintentarBusqueda}
              />
            </View>
          ) : sinResultados ? (
            <View style={{ marginTop: insets.top + 140 }}>
              <EstadoVacio titulo="Sin resultados" texto="Prueba con otro título." />
            </View>
          ) : (
            <FlatList
              data={resultadosBusqueda}
              keyExtractor={(item) => String(item.id)}
              numColumns={tipoBusqueda === 'movie' ? 3 : 2}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingTop: insets.top + (buscarAtiva ? 230 : 95),
                paddingBottom: 140,
              }}
              onScrollBeginDrag={() => Keyboard.dismiss()}
              renderItem={({ item }) =>
                tipoBusqueda === 'movie' ? (
                  <MovieResultItem
                    item={item}
                    onPeliculaClick={onPeliculaClick}
                    libraryMap={libraryMap}
                  />
                ) : (
                  <ActorResultItem item={item} onActorClick={onActorClick} />
                )
              }
            />
          )}
        </Animated.View>
      )}

      {/* Modal para añadir nuevos carruseles/categorías */}
      <CategoryModal
        visible={mostrarDialogo}
        onClose={() => setMostrarDialogo(false)}
        carruselesActivos={carruselesActivos}
        onToggle={(name) =>
          persistCarruseles(
            carruselesActivos.includes(name)
              ? carruselesActivos.filter((c) => c !== name)
              : [...carruselesActivos, name],
          )
        }
        fontFamily={fontFamily}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#020617' },
  webCenteringWrapper: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    flex: 1,
  },
  content: { flex: 1, paddingTop: 0 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2000 },
  headerRow: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center' },
  titulo: { color: '#fff', fontSize: 32, fontWeight: '800' },
  actionsTopRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  perfilBtnMini: { marginLeft: 4 },
  perfilInnerMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilFotoMini: { width: '100%', height: '100%' },

  searchArea: { position: 'absolute', left: 20, right: 20 },
  searchField: {
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  clearBtn: { paddingLeft: 8 },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.8)' },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  busquedaBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#020617',
    zIndex: 1500,
  },
  movieGridItem: { width: '33.33%', padding: 4 },
  actorGridItem: { width: '50%', padding: 6 },
  resultCard: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CardSurface,
  },
  fullImg: { width: '100%', height: '100%' },
  actorName: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 4,
  },
  eyeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.4)',
  },
});
