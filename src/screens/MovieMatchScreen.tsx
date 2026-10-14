/**
 * ARCHIVO: screens/MovieMatchScreen.tsx
 * DESCRIPCIÓN: El juego del Movie Match. Todos ven el mismo mazo (lo generó quien creó el Match);
 * cada uno desliza en su móvil: derecha = me apetece, izquierda = paso.
 * Cuando a todos les apetece la misma peli, es una coincidencia. Al llegar al objetivo (o si
 * alguien lo termina antes) se enseñan todas las coincidencias.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  ZoomIn,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  IconArrowBackUp,
  IconCards,
  IconChevronLeft,
  IconHeartFilled,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { nombreDe, usePerfiles } from '../hooks/usePerfiles';
import {
  calcularCoincidencias,
  deshacerVoto,
  esMatchAntiguo,
  observarMatch,
  observarVotos,
  registrarCoincidencias,
  terminarMatch,
  votar,
} from '../services/repositorioMatches';
import { enlazarMatch } from '../services/repositorioChats';
import { posterUrl } from '../services/tmdbClient';
import { Avatar } from '../components/common/Avatar';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';
import type { CartaMazo, MovieMatch, UsuarioPerfil, VotosMatch } from '../types';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';
import { FondoCristal } from '../components/common/FondoCristal';

type VotoLocal = 'si' | 'no' | 'deshecho';

// Salida de una carta: arranca rápida y frena (ease-out fuerte)
const SALIDA = Easing.bezier(0.23, 1, 0.32, 1);

/** Botón redondo que se hunde al pulsarlo (respuesta al tocar, no al soltar). */
function BotonRedondo({
  tamano,
  onPress,
  etiqueta,
  estilo,
  desactivado,
  children,
}: {
  tamano: number;
  onPress: () => void;
  etiqueta: string;
  estilo: StyleProp<ViewStyle>;
  desactivado?: boolean;
  children: React.ReactNode;
}) {
  const escala = useSharedValue(1);
  const estiloEscala = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return (
    <Pressable
      onPressIn={() => {
        escala.value = withTiming(0.94, { duration: 120, easing: SALIDA });
      }}
      onPressOut={() => {
        escala.value = withSpring(1, { duration: 300, dampingRatio: 0.7 });
      }}
      onPress={onPress}
      disabled={desactivado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={8}
      pressRetentionOffset={16}
    >
      <Animated.View
        style={[
          { width: tamano, height: tamano, borderRadius: tamano / 2 },
          styles.botonBase,
          estilo,
          desactivado && { opacity: 0.35 },
          estiloEscala,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** "En el Por ver de Ana y Beto", "Recomendada para el grupo"… */
function motivoCarta(
  c: CartaMazo,
  yo: string,
  perfiles: Record<string, UsuarioPerfil | undefined>,
) {
  const nombres = (uids: string[]) => {
    const n = uids.map((u) => (u === yo ? 'ti' : nombreDe(perfiles[u], true)));
    return n.length <= 2 ? n.join(' y ') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`;
  };
  if (c.pv?.length) return `En el Por ver de ${nombres(c.pv)}`;
  if (c.r) return 'Recomendada para el grupo';
  if (c.v?.length)
    return `${c.v.length === 1 && c.v[0] === yo ? 'Ya la viste' : `Ya la vio ${nombres(c.v)}`}`;
  return 'Popular estos días';
}

export function MovieMatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId } = route.params as { matchId: string };
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const yo = user?.uid ?? '';

  const [match, setMatch] = useState<MovieMatch | null | undefined>(undefined);
  const [votos, setVotos] = useState<Record<string, VotosMatch>>({});
  const [local, setLocal] = useState<Record<number, VotoLocal>>({});
  const [historial, setHistorial] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmarFin, setConfirmarFin] = useState(false);
  const [verCoincidencias, setVerCoincidencias] = useState(false);
  const [celebrando, setCelebrando] = useState<CartaMazo | null>(null);
  const vistas = useRef<Set<number> | null>(null);

  useEffect(
    () =>
      observarMatch(matchId, setMatch, () => {
        setMatch(null);
        setError('No puedes ver este Match.');
      }),
    [matchId],
  );
  useEffect(() => observarVotos(matchId, setVotos, () => undefined), [matchId]);

  const perfiles = usePerfiles(match?.participants ?? []);
  const jugable = !!match && !esMatchAntiguo(match);
  const mazo = useMemo(() => (jugable ? match!.mazo : []), [jugable, match]);

  // Mis votos: los del servidor más los que acabo de hacer (o deshacer) aquí
  const votada = useCallback(
    (id: number) => {
      const l = local[id];
      if (l === 'deshecho') return false;
      if (l) return true;
      const mios = votos[yo];
      return !!mios && (mios.si.includes(id) || mios.no.includes(id));
    },
    [local, votos, yo],
  );
  const pendientes = useMemo(() => mazo.filter((c) => !votada(c.id)), [mazo, votada]);
  const actual = pendientes[0];
  const siguiente = pendientes[1];

  // Precarga de los pósters que vienen
  useEffect(() => {
    const urls = pendientes
      .slice(0, 3)
      .map((c) => posterUrl(c.p, 'w500'))
      .filter((u): u is string => !!u);
    if (urls.length) void Image.prefetch(urls);
  }, [pendientes]);

  // Coincidencias: las calcula este móvil y las registra (una transacción evita duplicados)
  useEffect(() => {
    if (!match || !jugable || match.estado !== 'active') return;
    const calculadas = calcularCoincidencias(match, votos);
    if (calculadas.some((id) => !match.coincidencias.includes(id))) {
      void registrarCoincidencias(match, calculadas).catch(() => undefined);
    }
  }, [match, votos, jugable]);

  // Celebración cuando aparece una coincidencia nueva (no las que ya había al entrar)
  useEffect(() => {
    if (!match || !jugable) return;
    if (!vistas.current) {
      vistas.current = new Set(match.coincidencias);
      return;
    }
    const nueva = match.coincidencias.find((id) => !vistas.current!.has(id));
    match.coincidencias.forEach((id) => vistas.current!.add(id));
    if (nueva) {
      setCelebrando(mazo.find((c) => c.id === nueva) ?? null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const t = setTimeout(() => setCelebrando(null), 2600);
      return () => clearTimeout(t);
    }
  }, [match, jugable, mazo]);

  // ── Gesto ──
  const anchoCarta = Math.min(width - 40, 420);
  const altoCarta = Math.min(anchoCarta * 1.5, height * 0.58);
  const UMBRAL = anchoCarta * 0.28;
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  // +1 si se agarra por la mitad de arriba, -1 por la de abajo: gira como una carta de verdad
  const agarre = useSharedValue(1);
  // Lado al que se votará si se suelta ahora (-1 paso, 0 nada, 1 me apetece), para el háptico
  const lado = useSharedValue(0);
  const reducir = useReducedMotion();

  useEffect(() => {
    x.value = 0;
    y.value = 0;
    lado.value = 0;
  }, [actual?.id, x, y, lado]);

  const alVotar = useCallback(
    (si: boolean) => {
      const carta = pendientes[0];
      if (!carta) return;
      setLocal((prev) => ({ ...prev, [carta.id]: si ? 'si' : 'no' }));
      setHistorial((prev) => [...prev, carta.id]);
      votar(matchId, carta.id, si).catch(() => {
        setLocal((prev) => ({ ...prev, [carta.id]: 'deshecho' }));
        setAviso('No se ha guardado tu voto. Revisa la conexión.');
      });
    },
    [matchId, pendientes],
  );

  const votoConHaptico = useCallback(
    (si: boolean) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      alVotar(si);
    },
    [alVotar],
  );

  // Botones: la carta sale con el mismo gesto que al deslizarla (o se funde, con reducir movimiento)
  const lanzar = (si: boolean) => {
    if (reducir) {
      votoConHaptico(si);
      return;
    }
    agarre.value = 1;
    x.value = withTiming((si ? 1 : -1) * width * 1.4, { duration: 260, easing: SALIDA }, (fin) => {
      if (fin) runOnJS(votoConHaptico)(si);
    });
    y.value = withTiming(-40, { duration: 260, easing: SALIDA });
  };

  // Al cruzar el umbral mientras se arrastra: un toque (sabes que, si sueltas, cuenta)
  useAnimatedReaction(
    () => (x.value > UMBRAL ? 1 : x.value < -UMBRAL ? -1 : 0),
    (ahora, antes) => {
      if (antes !== null && ahora !== antes && ahora !== 0) {
        runOnJS(Haptics.selectionAsync)();
      }
      lado.value = ahora;
    },
    [UMBRAL],
  );

  const deshacer = () => {
    const id = historial[historial.length - 1];
    if (id === undefined || match?.coincidencias.includes(id)) return;
    setHistorial((prev) => prev.slice(0, -1));
    setLocal((prev) => ({ ...prev, [id]: 'deshecho' }));
    deshacerVoto(matchId, id).catch(() => setAviso('No hemos podido deshacer el voto.'));
  };

  const pan = Gesture.Pan()
    .enabled(!!actual)
    .onBegin((e) => {
      agarre.value = e.y < altoCarta / 2 ? 1 : -1;
    })
    .onUpdate((e) => {
      x.value = e.translationX;
      // En vertical se mueve, pero con resistencia: la baraja es horizontal
      y.value = e.translationY * 0.35;
    })
    .onEnd((e) => {
      // Decide por adónde iría con la inercia del dedo, no solo por dónde está: un golpe corto vale
      const proyectada = e.translationX + e.velocityX * 0.18;
      if (Math.abs(proyectada) > UMBRAL) {
        const si = proyectada > 0;
        const destino = (si ? 1 : -1) * width * 1.4;
        // Sale a la velocidad que llevaba el dedo (entre 150 y 300 ms)
        const rapidez = Math.max(Math.abs(e.velocityX), 1200);
        const ms = Math.min(300, Math.max(150, (Math.abs(destino - x.value) / rapidez) * 1000));
        x.value = withTiming(destino, { duration: ms, easing: SALIDA }, (fin) => {
          if (fin) runOnJS(votoConHaptico)(si);
        });
        y.value = withTiming(y.value + e.velocityY * 0.12, { duration: ms, easing: SALIDA });
      } else {
        // Vuelve a su sitio con un muelle que conserva la velocidad del dedo
        x.value = withSpring(0, { duration: 420, dampingRatio: 0.72, velocity: e.velocityX });
        y.value = withSpring(0, { duration: 420, dampingRatio: 0.8, velocity: e.velocityY });
      }
    });

  const estiloCarta = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      {
        rotate: `${
          reducir
            ? 0
            : interpolate(x.value, [-width, 0, width], [-12, 0, 12], Extrapolation.CLAMP) *
              agarre.value
        }deg`,
      },
    ],
  }));
  // Tinte de color que crece con el arrastre (turquesa o rojo) y la etiqueta del voto
  const estiloSi = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [UMBRAL * 0.2, UMBRAL], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(x.value, [0, UMBRAL], [0.9, 1], Extrapolation.CLAMP) },
      { rotate: '-8deg' },
    ],
  }));
  const estiloNo = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-UMBRAL, -UMBRAL * 0.2], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(x.value, [-UMBRAL, 0], [1, 0.9], Extrapolation.CLAMP) },
      { rotate: '8deg' },
    ],
  }));
  const estiloTinteSi = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, UMBRAL * 1.4], [0, 0.35], Extrapolation.CLAMP),
  }));
  const estiloTinteNo = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-UMBRAL * 1.4, 0], [0.35, 0], Extrapolation.CLAMP),
  }));
  // La siguiente carta asoma detrás, algo más pequeña y más abajo, y sube al sitio mientras arrastras
  const estiloDetras = useAnimatedStyle(() => {
    const p = interpolate(Math.abs(x.value), [0, UMBRAL * 1.2], [0, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: (1 - p) * 18 }, { scale: 0.93 + p * 0.07 }],
    };
  });
  const estiloVelo = useAnimatedStyle(() => ({
    opacity:
      0.45 * (1 - interpolate(Math.abs(x.value), [0, UMBRAL * 1.2], [0, 1], Extrapolation.CLAMP)),
  }));
  // Los botones responden al arrastre: el del lado al que vas crece
  const estiloBotonSi = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(x.value, [0, UMBRAL], [1, 1.12], Extrapolation.CLAMP) }],
  }));
  const estiloBotonNo = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(x.value, [-UMBRAL, 0], [1.12, 1], Extrapolation.CLAMP) }],
  }));

  // ── Estados de carga y error ──
  if (match === undefined) {
    return (
      <View style={[styles.flex, styles.centro]}>
        <LoaderClaqueta texto="Abriendo el Match…" />
      </View>
    );
  }

  const cabecera = (titulo: string, derecha?: React.ReactNode) => (
    <View style={[styles.cabecera, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Volver">
        <IconChevronLeft size={28} color={COLORS.text} strokeWidth={2} />
      </Pressable>
      <Text style={styles.titulo} numberOfLines={1}>
        {titulo}
      </Text>
      {derecha}
    </View>
  );

  if (!match || !jugable || match.estado === 'cancelled') {
    return (
      <View style={styles.flex}>
        {cabecera('Movie Match')}
        <View style={[styles.centro, { flex: 1, paddingHorizontal: 36, gap: 12 }]}>
          <IconCards size={56} color={COLORS.textMuted} strokeWidth={1.5} />
          <Text style={styles.vacioTitulo}>{error ?? 'Este Match ya no se puede jugar'}</Text>
          <Text style={styles.vacioTexto}>
            {match && !jugable
              ? 'Es de una versión anterior de VeoVeo. Empezad uno nuevo.'
              : 'Puede que lo hayan cancelado o que ya no participes.'}
          </Text>
          {match?.chatId ? (
            <Pressable
              style={[styles.botonPrincipal, { alignSelf: 'stretch' }]}
              onPress={() => {
                const chatId = match.chatId!;
                // Libera el botón del chat si aún apunta a este Match
                void enlazarMatch(chatId, null)
                  .catch(() => undefined)
                  .finally(() => navigation.replace('MatchConfig', { chatId }));
              }}
            >
              <Text style={styles.botonPrincipalTexto}>Nuevo Match</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const coincidencias = match.coincidencias
    .map((id) => mazo.find((c) => c.id === id))
    .filter((c): c is CartaMazo => !!c);
  const terminado = match.estado === 'finished';
  const progreso = (uid: string) => {
    const v = votos[uid];
    return v ? new Set([...v.si, ...v.no].filter((id) => mazo.some((c) => c.id === id))).size : 0;
  };

  const rejilla = (
    <View style={styles.rejilla}>
      {coincidencias.map((c) => (
        <Pressable
          key={c.id}
          style={styles.resultado}
          onPress={() => navigation.navigate('Pelicula', { movieId: c.id })}
          accessibilityLabel={c.t}
        >
          <Image
            source={{ uri: posterUrl(c.p, 'w342') ?? undefined }}
            style={styles.resultadoPoster}
            cachePolicy="memory-disk"
            transition={150}
          />
          <Text style={styles.resultadoTitulo} numberOfLines={2}>
            {c.t}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // ── Terminado: todas las coincidencias ──
  if (terminado) {
    const quien = match.terminadoPor ? nombreDe(perfiles[match.terminadoPor], true) : null;
    return (
      <View style={styles.flex}>
        {cabecera('Movie Match')}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        >
          <View style={styles.resultadoCabecera}>
            <IconCards size={56} color={COLORS.accent} strokeWidth={1.5} />
            <Text style={styles.resultadoTitular}>
              {coincidencias.length > 0 ? '¡Tenéis plan!' : 'Esta vez no ha habido suerte'}
            </Text>
            <Text style={styles.vacioTexto}>
              {coincidencias.length > 0
                ? `${coincidencias.length} ${coincidencias.length === 1 ? 'peli os apetece' : 'pelis os apetecen'} a todos. Elegid cuál ver ahora.`
                : 'Ninguna peli os ha apetecido a todos. Probad con otro mazo.'}
            </Text>
            {quien && (
              <Text style={styles.ayuda}>
                {match.terminadoPor === yo ? 'Lo terminaste tú' : `Lo terminó ${quien}`} antes de
                llegar a {match.objetivo}.
              </Text>
            )}
          </View>
          {rejilla}
          <Pressable
            style={styles.botonPrincipal}
            onPress={() =>
              navigation.replace('MatchConfig', match.chatId ? { chatId: match.chatId } : undefined)
            }
          >
            <Text style={styles.botonPrincipalTexto}>Nuevo Match</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── Jugando ──
  return (
    <View style={styles.flex}>
      {cabecera(
        'Movie Match',
        <Pressable
          style={styles.contador}
          onPress={() => setVerCoincidencias(true)}
          accessibilityLabel={`${coincidencias.length} de ${match.objetivo} coincidencias. Ver`}
        >
          <IconCards size={16} color={COLORS.accent} strokeWidth={2} />
          <Text style={styles.contadorTexto}>
            {coincidencias.length}/{match.objetivo}
          </Text>
        </Pressable>,
      )}

      <View style={styles.participantes}>
        {match.participants.map((uid) => (
          <View
            key={uid}
            style={styles.participante}
            accessible
            accessibilityLabel={`${uid === yo ? 'Tú' : nombreDe(perfiles[uid], true)}: ${progreso(uid)} de ${mazo.length}`}
          >
            <Avatar uri={perfiles[uid]?.fotoPerfil} nombre={perfiles[uid]?.username} tamano={28} />
            <Text style={styles.participanteTexto}>
              {progreso(uid)}/{mazo.length}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.mesa}>
        {actual ? (
          <>
            {siguiente && (
              <Animated.View
                style={[styles.carta, { width: anchoCarta, height: altoCarta }, estiloDetras]}
              >
                <Image
                  source={{ uri: posterUrl(siguiente.p, 'w500') ?? undefined }}
                  style={StyleSheet.absoluteFill}
                  cachePolicy="memory-disk"
                />
                {/* Velo que se aclara a medida que la de delante se va */}
                <Animated.View style={[styles.velo, estiloVelo]} pointerEvents="none" />
              </Animated.View>
            )}
            <GestureDetector gesture={pan}>
              <Animated.View
                key={actual.id}
                style={[styles.carta, { width: anchoCarta, height: altoCarta }, estiloCarta]}
              >
                <Image
                  source={{ uri: posterUrl(actual.p, 'w500') ?? undefined }}
                  placeholder={{ uri: posterUrl(actual.p, 'w185') ?? undefined }}
                  style={StyleSheet.absoluteFill}
                  cachePolicy="memory-disk"
                  transition={120}
                />
                <Animated.View
                  style={[styles.tinte, { backgroundColor: COLORS.accent }, estiloTinteSi]}
                  pointerEvents="none"
                />
                <Animated.View
                  style={[styles.tinte, { backgroundColor: COLORS.error }, estiloTinteNo]}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(2,6,23,0.55)', 'rgba(2,6,23,0.96)']}
                  locations={[0, 0.45, 1]}
                  style={styles.degradado}
                >
                  <View style={styles.motivoPastilla}>
                    <Text style={styles.motivo}>{motivoCarta(actual, yo, perfiles)}</Text>
                  </View>
                  <View style={styles.filaTitulo}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.peliTitulo} numberOfLines={2}>
                        {actual.t}
                      </Text>
                      {actual.a ? <Text style={styles.peliAnio}>{actual.a}</Text> : null}
                    </View>
                    <Pressable
                      onPress={() => navigation.navigate('Pelicula', { movieId: actual.id })}
                      hitSlop={10}
                      accessibilityLabel={`Ver la ficha de ${actual.t}`}
                    >
                      <IconInfoCircle size={30} color={COLORS.text} strokeWidth={1.8} />
                    </Pressable>
                  </View>
                </LinearGradient>
                <Animated.View
                  style={[styles.sello, styles.selloSi, estiloSi]}
                  pointerEvents="none"
                >
                  <IconHeartFilled size={18} color={COLORS.onAccent} />
                  <Text style={[styles.selloTexto, { color: COLORS.onAccent }]}>Me apetece</Text>
                </Animated.View>
                <Animated.View
                  style={[styles.sello, styles.selloNo, estiloNo]}
                  pointerEvents="none"
                >
                  <IconX size={18} color="#fff" strokeWidth={3} />
                  <Text style={[styles.selloTexto, { color: '#fff' }]}>Paso</Text>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          </>
        ) : (
          <View style={[styles.centro, { paddingHorizontal: 32, gap: 12 }]}>
            <IconCards size={56} color={COLORS.accent} strokeWidth={1.5} />
            <Text style={styles.vacioTitulo}>Ya has votado todo el mazo</Text>
            <Text style={styles.vacioTexto}>
              {coincidencias.length > 0
                ? `Lleváis ${coincidencias.length} ${coincidencias.length === 1 ? 'coincidencia' : 'coincidencias'}. Cuando voten los demás pueden salir más.`
                : 'Cuando voten los demás veréis si coincidís.'}
            </Text>
            {coincidencias.length > 0 && rejilla}
          </View>
        )}
      </View>

      <View style={[styles.botonera, { paddingBottom: insets.bottom + 16 }]}>
        {actual ? (
          <>
            <Animated.View style={estiloBotonNo}>
              <BotonRedondo
                tamano={64}
                onPress={() => lanzar(false)}
                etiqueta="Paso"
                estilo={styles.botonCristal}
              >
                <IconX size={28} color="#fff" strokeWidth={2.4} />
              </BotonRedondo>
            </Animated.View>
            <BotonRedondo
              tamano={46}
              onPress={deshacer}
              desactivado={historial.length === 0}
              etiqueta="Deshacer el último voto"
              estilo={styles.botonCristal}
            >
              <IconArrowBackUp size={20} color={COLORS.textMuted} strokeWidth={2} />
            </BotonRedondo>
            <Animated.View style={estiloBotonSi}>
              <View style={styles.halo} pointerEvents="none" />
              <BotonRedondo
                tamano={76}
                onPress={() => lanzar(true)}
                etiqueta="Me apetece"
                estilo={styles.botonSi}
              >
                <IconHeartFilled size={32} color={COLORS.onAccent} />
              </BotonRedondo>
            </Animated.View>
          </>
        ) : null}
      </View>
      <Pressable
        onPress={() => setConfirmarFin(true)}
        style={[styles.terminar, { bottom: insets.bottom + (actual ? 112 : 24) }]}
        hitSlop={8}
      >
        <Text style={styles.terminarTexto}>Terminar el Match</Text>
      </Pressable>

      {aviso && (
        <Pressable onPress={() => setAviso(null)} style={[styles.aviso, { top: insets.top + 60 }]}>
          <Text style={styles.avisoTexto}>{aviso}</Text>
        </Pressable>
      )}

      {celebrando && (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(260)}
          style={StyleSheet.absoluteFill}
        >
          {/* Fondo translúcido fijo (se funde la capa, nunca se anima la intensidad del blur) */}
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
            experimentalBlurMethod="dimezisBlurView"
          />
          <Pressable style={styles.celebracion} onPress={() => setCelebrando(null)}>
            <Animated.Text
              entering={reducir ? FadeIn.duration(200) : FadeIn.duration(260).delay(80)}
              style={styles.celebracionTitulo}
            >
              ¡Coincidencia!
            </Animated.Text>
            <Animated.View
              entering={
                reducir
                  ? FadeIn.duration(200)
                  : ZoomIn.springify().damping(14).stiffness(160).mass(0.8)
              }
              style={styles.celebracionMarco}
            >
              <Image
                source={{ uri: posterUrl(celebrando.p, 'w500') ?? undefined }}
                placeholder={{ uri: posterUrl(celebrando.p, 'w185') ?? undefined }}
                style={styles.celebracionPoster}
                cachePolicy="memory-disk"
              />
            </Animated.View>
            <Animated.View
              entering={FadeIn.duration(260).delay(reducir ? 0 : 220)}
              style={styles.celebracionGente}
            >
              {match.participants.map((uid) => (
                <View key={uid} style={styles.celebracionAvatar}>
                  <Avatar
                    uri={perfiles[uid]?.fotoPerfil}
                    nombre={perfiles[uid]?.username}
                    tamano={34}
                  />
                </View>
              ))}
            </Animated.View>
            <Animated.Text
              entering={FadeIn.duration(260).delay(reducir ? 0 : 280)}
              style={styles.celebracionTexto}
            >
              A todos os apetece ver {celebrando.t}
            </Animated.Text>
          </Pressable>
        </Animated.View>
      )}

      {verCoincidencias && (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(160)}
          style={styles.panelFondo}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVerCoincidencias(false)}
            accessibilityLabel="Cerrar"
          />
          <View style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}>
            <FondoCristal />
            <Text style={styles.panelTitulo}>
              {coincidencias.length === 0
                ? 'Aún no hay coincidencias'
                : `${coincidencias.length} de ${match.objetivo} coincidencias`}
            </Text>
            <ScrollView style={{ maxHeight: height * 0.55 }}>
              {coincidencias.length > 0 ? (
                rejilla
              ) : (
                <Text style={styles.vacioTexto}>Seguid deslizando.</Text>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      )}

      <ConfirmModal
        visible={confirmarFin}
        onClose={() => setConfirmarFin(false)}
        onConfirm={() => {
          setConfirmarFin(false);
          terminarMatch(match, nombreDe(perfiles[yo], true)).catch(() =>
            setAviso('No hemos podido terminar el Match.'),
          );
        }}
        title="Terminar el Match"
        message={`Se termina para todos y se quedan las ${coincidencias.length} coincidencias que llevéis.`}
        confirmText="Terminar"
        iconName="flag-outline"
        iconColor={COLORS.accent}
        confirmColor={COLORS.accent}
        fontFamily={FUENTES.texto}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  centro: { alignItems: 'center', justifyContent: 'center' },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  titulo: { flex: 1, color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(105,223,217,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(105,223,217,0.35)',
  },
  contadorTexto: { color: COLORS.accent, fontSize: 14, fontFamily: FUENTES.titulo },
  participantes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  participante: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
  },
  participanteTexto: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto },
  mesa: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  carta: {
    position: 'absolute',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.background },
  tinte: { ...StyleSheet.absoluteFillObject },
  degradado: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 90,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 6,
  },
  motivoPastilla: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(105,223,217,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(105,223,217,0.45)',
  },
  motivo: { color: COLORS.accent, fontSize: 12, fontFamily: FUENTES.seminegrita },
  filaTitulo: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  peliTitulo: { color: COLORS.text, fontSize: 24, lineHeight: 29, fontFamily: FUENTES.titulo },
  peliAnio: { color: COLORS.textMuted, fontSize: 15, fontFamily: FUENTES.texto, marginTop: 2 },
  sello: {
    position: 'absolute',
    top: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 999,
  },
  selloSi: { left: 20, backgroundColor: COLORS.accent },
  selloNo: { right: 20, backgroundColor: COLORS.error },
  selloTexto: { fontSize: 16, fontFamily: FUENTES.titulo },
  botonera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
    paddingTop: 12,
    minHeight: 100,
  },
  botonBase: { alignItems: 'center', justifyContent: 'center' },
  botonCristal: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  botonSi: { backgroundColor: COLORS.accent },
  // Halo turquesa suave detrás del botón principal (sin sombras animadas)
  halo: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 999,
    backgroundColor: 'rgba(105,223,217,0.16)',
  },
  terminar: { position: 'absolute', alignSelf: 'center' },
  terminarTexto: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FUENTES.seminegrita,
    textDecorationLine: 'underline',
  },
  vacioTitulo: {
    color: COLORS.text,
    fontSize: 20,
    fontFamily: FUENTES.titulo,
    textAlign: 'center',
  },
  vacioTexto: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
  },
  ayuda: { color: COLORS.textMuted, fontSize: 13, fontFamily: FUENTES.texto, textAlign: 'center' },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  resultado: { width: 104, gap: 6 },
  resultadoPoster: { width: 104, height: 156, borderRadius: 14, backgroundColor: COLORS.card },
  resultadoTitulo: { color: COLORS.text, fontSize: 12, fontFamily: FUENTES.seminegrita },
  resultadoCabecera: { alignItems: 'center', gap: 10, paddingTop: 16 },
  resultadoTitular: {
    color: COLORS.text,
    fontSize: 26,
    fontFamily: FUENTES.portada,
    textAlign: 'center',
  },
  botonPrincipal: {
    marginTop: 28,
    height: 52,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPrincipalTexto: { color: COLORS.onAccent, fontSize: 16, fontFamily: FUENTES.titulo },
  aviso: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.card,
  },
  avisoTexto: { color: COLORS.text, fontSize: 14, fontFamily: FUENTES.texto, textAlign: 'center' },
  celebracion: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 32,
  },
  celebracionTitulo: { color: COLORS.accent, fontSize: 34, fontFamily: FUENTES.portada },
  celebracionMarco: {
    padding: 3,
    borderRadius: 24,
    backgroundColor: 'rgba(105,223,217,0.35)',
  },
  celebracionPoster: { width: 200, height: 300, borderRadius: 21 },
  celebracionGente: { flexDirection: 'row' },
  celebracionAvatar: {
    marginHorizontal: -5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  celebracionTexto: {
    color: COLORS.text,
    fontSize: 17,
    fontFamily: FUENTES.seminegrita,
    textAlign: 'center',
  },
  panelFondo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.7)',
    justifyContent: 'flex-end',
  },
  panel: {
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  panelTitulo: { color: COLORS.text, fontSize: 18, fontFamily: FUENTES.titulo, marginBottom: 4 },
});
