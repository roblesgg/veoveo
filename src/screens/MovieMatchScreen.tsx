/**
 * ARCHIVO: screens/MovieMatchScreen.tsx
 * DESCRIPCIÓN: Pantalla principal del juego 'Movie Match'.
 * Swipe derecha = SÍ (verde), izquierda = NO (rojo).
 * Algoritmo multi-fuente: watchlists + recomendaciones paralelas + trending/popular.
 * Contador de matches abre panel con resultados parciales en tiempo real.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { observarMatch, votarPelicula } from '../services/repositorioMatches';
import { tmdbApi, posterUrl } from '../services/tmdbClient';
import { MovieMatch, MovieDetails } from '../types';
import { COLORS } from '../theme/colors';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';
import { SHADOWS } from '../theme/theme';

// ─── Helpers ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MovieMatchScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();

  const SCREEN_WIDTH = windowWidth;
  const BAR_WIDTH = Math.min(windowWidth * 0.85, 420);
  const SWIPE_THRESHOLD = BAR_WIDTH * 0.25;

  const { matchId } = route.params;

  // ── State ──
  const [match, setMatch] = useState<MovieMatch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showMatchesPanel, setShowMatchesPanel] = useState(false);
  const [currentDetails, setCurrentDetails] = useState<MovieDetails | null>(null);
  const [partialMatchDetails, setPartialMatchDetails] = useState<MovieDetails[]>([]);

  // Refs
  const hasFetched = useRef(false);
  const loadedMatchIds = useRef<Set<number>>(new Set());

  // ── Reanimated ──
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // ── Suscripción al match ──
  useEffect(() => {
    return observarMatch(matchId, setMatch);
  }, [matchId]);

  // ── Carga incremental de detalles de películas que hacen match ──
  useEffect(() => {
    if (!match?.matchedMovies.length) return;
    const newIds = match.matchedMovies.filter((id) => !loadedMatchIds.current.has(id));
    if (!newIds.length) return;
    newIds.forEach((id) => loadedMatchIds.current.add(id));
    void Promise.all(newIds.map((id) => tmdbApi.obtenerDetallesPelicula(id))).then((results) => {
      setPartialMatchDetails((prev) => {
        const existing = new Set(prev.map((d) => d.id));
        return [...prev, ...results.filter((d) => !existing.has(d.id))];
      });
    });
  }, [match?.matchedMovies]);

  // ── Algoritmo de películas ──
  useEffect(() => {
    if (!match || !user || hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);

    void (async () => {
      try {
        const db = getFirestore();

        // 1. Leer por_ver de cada participante por separado
        const watchlistsPerUser = new Map<string, Set<number>>();
        const moviesById = new Map<number, any>();

        for (const uid of match.participants) {
          const snap = await getDoc(doc(db, 'usuarios', uid, 'biblioteca', 'por_ver'));
          const userSet = new Set<number>();
          if (snap.exists()) {
            const data = snap.data() as { peliculas: any[] };
            for (const p of data.peliculas ?? []) {
              userSet.add(p.idPelicula);
              if (!moviesById.has(p.idPelicula)) {
                moviesById.set(p.idPelicula, {
                  id: p.idPelicula,
                  title: p.titulo,
                  poster_path: p.rutaPoster,
                  release_date: '',
                });
              }
            }
          }
          watchlistsPerUser.set(uid, userSet);
        }

        // 2. IDs ya votados por el usuario actual
        const votedIds = new Set<string>();
        const currentVotes = (match.votes || {}) as Record<string, string[]>;
        const currentNoVotes = (match.noVotes || {}) as Record<string, string[]>;
        Object.keys(currentVotes).forEach((mid) => {
          if (currentVotes[mid]?.includes(user.uid)) votedIds.add(mid);
        });
        Object.keys(currentNoVotes).forEach((mid) => {
          if (currentNoVotes[mid]?.includes(user.uid)) votedIds.add(mid);
        });

        const seenIds = new Set<string>(votedIds);

        // 3. Coincidencias: películas en TODAS las listas
        const allSets = [...watchlistsPerUser.values()];
        const coincidenceIds =
          allSets.length > 0 ? [...allSets[0]].filter((id) => allSets.every((s) => s.has(id))) : [];
        const coincidenceSet = new Set(coincidenceIds);

        // 4. Individuales: en alguna lista pero no en todas
        const individualIds = [...moviesById.keys()].filter((id) => !coincidenceSet.has(id));

        const toQueueItem = (id: number) => moviesById.get(id)!;
        const filterUnseen = (ids: number[]) =>
          ids
            .filter((id) => !seenIds.has(String(id)))
            .map((id) => {
              seenIds.add(String(id));
              return toQueueItem(id);
            });

        const coincidencePart = filterUnseen(shuffle(coincidenceIds));
        const individualPart = filterUnseen(shuffle(individualIds));

        // 5. Fallback variado: tendencias + populares con páginas aleatorias
        const fallbackPart: any[] = [];
        const mapTmdb = (p: any) => ({
          id: p.id,
          title: p.title,
          poster_path: p.poster_path,
          release_date: p.release_date?.split('-')[0] || '',
        });
        const addFallback = (items: any[]) => {
          for (const m of items) {
            if (m.poster_path && !seenIds.has(String(m.id))) {
              seenIds.add(String(m.id));
              fallbackPart.push(mapTmdb(m));
            }
          }
        };

        const [trending, popular1, popular2] = await Promise.all([
          tmdbApi.obtenerTendencias('es-ES', 'week').catch(() => null),
          tmdbApi.obtenerPopulares('es-ES', Math.floor(Math.random() * 10) + 1).catch(() => null),
          tmdbApi.obtenerPopulares('es-ES', Math.floor(Math.random() * 10) + 1).catch(() => null),
        ]);

        const fallbackRaw = shuffle([
          ...(trending?.results ?? []),
          ...(popular1?.results ?? []),
          ...(popular2?.results ?? []),
        ]);
        addFallback(fallbackRaw);

        setQueue([...coincidencePart, ...individualPart, ...fallbackPart]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [match, user, retryKey]);

  const handleBuscarMas = useCallback(() => {
    hasFetched.current = false;
    setQueue([]);
    setCurrentIndex(0);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  // Precarga detalles de la carta actual para el modal info
  useEffect(() => {
    if (queue[currentIndex]) {
      void tmdbApi
        .obtenerDetallesPelicula(Number(queue[currentIndex].id))
        .then(setCurrentDetails)
        .catch(() => {});
    }
  }, [currentIndex, queue]);

  // ── Swipe logic ──
  const onSwipeComplete = useCallback(
    (direction: 'right' | 'left') => {
      if (!user || !match || !queue[currentIndex]) return;
      const movieId = queue[currentIndex].id;
      void votarPelicula(matchId, user.uid, movieId, direction === 'right' ? 'yes' : 'no');
      translateX.value = 0;
      translateY.value = 0;
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex, matchId, queue, user, match],
  );

  const onGestureEvent = (event: any) => {
    translateX.value = event.nativeEvent.translationX;
    translateY.value = event.nativeEvent.translationY;
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) {
      if (Math.abs(event.nativeEvent.translationX) > SWIPE_THRESHOLD) {
        const direction = event.nativeEvent.translationX > 0 ? 'right' : 'left';
        translateX.value = withSpring(
          direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100,
        );
        runOnJS(onSwipeComplete)(direction);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    }
  };

  // ── Animated styles ──
  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-12, 0, 12],
      Extrapolate.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // Overlay de color sobre la carta: verde a la derecha, rojo a la izquierda
  const cardOverlayStyle = useAnimatedStyle(() => {
    const rightOpacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 1.5],
      [0, 0.5],
      Extrapolate.CLAMP,
    );
    const leftOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD * 1.5, 0],
      [0.5, 0],
      Extrapolate.CLAMP,
    );
    if (translateX.value >= 0) {
      return {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#2ecc71',
        opacity: rightOpacity,
        borderRadius: 24,
      };
    }
    return {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#ff5050',
      opacity: leftOpacity,
      borderRadius: 24,
    };
  });

  // ── Render ──
  if (loading || !match) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <LoaderClaqueta texto="Preparando las pelis…" />
      </View>
    );
  }

  const currentMovie = queue[currentIndex];
  const matchCount = match.matchedMovies.length;

  return (
    <View style={styles.container}>
      {/* ── CABECERA ── */}
      <BlurView
        intensity={80}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 15 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Movie Match</Text>
          <Pressable
            style={styles.matchCounter}
            onPress={() => matchCount > 0 && setShowMatchesPanel(true)}
            hitSlop={8}
          >
            <Ionicons name="flame" size={16} color="#69DFD9" />
            <Text style={styles.countText}>
              {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
            </Text>
            {matchCount > 0 && <Ionicons name="chevron-forward" size={12} color="#69DFD9" />}
          </Pressable>
        </View>
      </BlurView>

      {/* ── DECK ── */}
      <View style={styles.deck}>
        {match.status === 'finished' ? (
          /* A: Juego terminado */
          <ScrollView
            contentContainerStyle={styles.resultsScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.resultsHeader}>
              <Ionicons name="trophy" size={80} color="#f1c40f" />
              <Text style={styles.matchFinishedTitle}>¡Objetivo conseguido!</Text>
              <Text style={styles.matchFinishedSub}>
                {matchCount}{' '}
                {matchCount === 1
                  ? 'película que os ha gustado a todos'
                  : 'películas que os han gustado a todos'}
                :
              </Text>
            </View>
            <View style={styles.resultsGrid}>
              {partialMatchDetails.map((movie) => (
                <Pressable
                  key={movie.id}
                  style={styles.resultCard}
                  onPress={() => {
                    setCurrentDetails(movie);
                    setShowInfo(true);
                  }}
                >
                  <Image
                    source={{ uri: posterUrl(movie.poster_path, 'w342')! }}
                    style={styles.resultPoster}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={2}>
                      {movie.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.btnCerrarFinal} onPress={() => navigation.goBack()}>
              <Text style={styles.btnCerrarText}>Volver al chat</Text>
            </Pressable>
          </ScrollView>
        ) : currentIndex < queue.length ? (
          /* B: Carta swipable */
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View
              style={[
                styles.card,
                { width: BAR_WIDTH, height: Math.min(windowHeight * 0.6, 600) },
                cardStyle,
                SHADOWS.macLight,
              ]}
            >
              <Image
                source={{ uri: posterUrl(currentMovie.poster_path, 'w500')! }}
                style={styles.poster}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.92)']}
                style={styles.cardGradient}
              >
                <View style={styles.movieInfo}>
                  <Text style={styles.movieTitle}>{currentMovie.title}</Text>
                  <Text style={styles.movieYear}>{currentMovie.release_date}</Text>
                </View>
                <Pressable onPress={() => setShowInfo(true)} style={styles.infoBtn}>
                  <Ionicons name="information-circle-outline" size={34} color="#fff" />
                </Pressable>
              </LinearGradient>

              {/* Overlay de color al deslizar */}
              <Animated.View style={cardOverlayStyle} pointerEvents="none" />
            </Animated.View>
          </PanGestureHandler>
        ) : loading ? (
          /* C: Cargando */
          <View style={styles.emptyDeck}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.emptyText}>Buscando películas...</Text>
          </View>
        ) : (
          /* D: Cola vacía */
          <View style={styles.emptyDeck}>
            <Ionicons name="film-outline" size={64} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>¡Has votado todo!</Text>
            <Text style={styles.emptyText}>No quedan más películas en tu cola.</Text>
            <Pressable style={styles.recargarBtn} onPress={handleBuscarMas}>
              <Text style={styles.recargarBtnText}>Buscar más películas</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── BOTONES RÁPIDOS ── */}
      {match.status !== 'finished' && currentIndex < queue.length && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
          <Pressable
            style={[styles.roundBtn, styles.roundBtnNo]}
            onPress={() => {
              translateX.value = withSpring(-SCREEN_WIDTH - 100);
              runOnJS(onSwipeComplete)('left');
            }}
          >
            <Ionicons name="close" size={32} color="#ff5050" />
          </Pressable>
          <Pressable
            style={[styles.roundBtn, styles.roundBtnYes]}
            onPress={() => {
              translateX.value = withSpring(SCREEN_WIDTH + 100);
              runOnJS(onSwipeComplete)('right');
            }}
          >
            <Ionicons name="heart" size={32} color="#2ecc71" />
          </Pressable>
        </View>
      )}

      {/* ── MODAL INFO PELÍCULA ── */}
      {showInfo && currentDetails && (
        <View style={StyleSheet.absoluteFillObject}>
          <Pressable onPress={() => setShowInfo(false)} style={StyleSheet.absoluteFillObject}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          </Pressable>
          <View style={[styles.infoModal, { bottom: insets.bottom + 100 }]}>
            <Text style={styles.modalTitle}>{currentDetails.title}</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalOverview}>{currentDetails.overview}</Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalMeta}>⭐ {currentDetails.vote_average?.toFixed(1)}</Text>
                <Text style={styles.modalMeta}>📅 {currentDetails.release_date}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── PANEL DE MATCHES PARCIALES ── */}
      <Modal
        visible={showMatchesPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMatchesPanel(false)}
      >
        <Pressable style={styles.panelBackdrop} onPress={() => setShowMatchesPanel(false)}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.panelHandle} />
          <Text style={styles.panelTitle}>
            {matchCount} {matchCount === 1 ? 'Match hasta ahora' : 'Matches hasta ahora'}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.panelScroll}
          >
            {partialMatchDetails.length === 0 ? (
              <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.resultsGrid}>
                {partialMatchDetails.map((movie) => (
                  <Pressable
                    key={movie.id}
                    style={styles.resultCard}
                    onPress={() => {
                      setCurrentDetails(movie);
                      setShowMatchesPanel(false);
                      setShowInfo(true);
                    }}
                  >
                    <Image
                      source={{ uri: posterUrl(movie.poster_path, 'w342')! }}
                      style={styles.resultPoster}
                    />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle} numberOfLines={2}>
                        {movie.title}
                      </Text>
                    </View>
                    <View style={styles.matchBadge}>
                      <Ionicons name="flame" size={12} color="#69DFD9" />
                      <Text style={styles.matchBadgeText}>Match</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  matchCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(105,223,217,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(105,223,217,0.25)',
  },
  countText: { color: '#69DFD9', fontSize: 12, fontWeight: '900' },
  deck: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  card: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#1e293b' },
  poster: { width: '100%', height: '100%' },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  movieInfo: { flex: 1 },
  movieTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  movieYear: { color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 4 },
  infoBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 48 },
  roundBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtnNo: {
    backgroundColor: 'rgba(255,80,80,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,80,80,0.3)',
  },
  roundBtnYes: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(46,204,113,0.3)',
  },
  emptyDeck: { alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 15, textAlign: 'center' },
  recargarBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 20,
  },
  recargarBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  matchFinishedTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  matchFinishedSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  btnCerrarText: { color: '#000', fontWeight: '800', fontSize: 16 },
  btnCerrarFinal: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 30,
  },
  infoModal: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    maxHeight: 300,
  },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 12 },
  modalScroll: { flex: 1 },
  modalOverview: { color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 22 },
  modalDetails: { flexDirection: 'row', gap: 20, marginTop: 20 },
  modalMeta: { color: COLORS.primary, fontWeight: '800' },
  resultsScroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  resultsHeader: { alignItems: 'center', marginBottom: 30 },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  resultCard: {
    width: 150,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
    ...SHADOWS.macLight,
    marginBottom: 12,
  },
  resultPoster: { width: '100%', aspectRatio: 2 / 3 },
  resultInfo: { padding: 10 },
  resultTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(105,223,217,0.85)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  matchBadgeText: { color: '#020617', fontSize: 10, fontWeight: '800' },
  panelBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  panelTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 16 },
  panelScroll: { paddingBottom: 20 },
});
