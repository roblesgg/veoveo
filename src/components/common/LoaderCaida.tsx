/**
 * Loader de la app: tres estrellas que caen escalonadas, con escala y giro, y se desvanecen abajo.
 * Reproduce fielmente el loader de referencia de Álvaro (Uiverse.io, andrew-manzyk), con el CSS
 * original en docs/diseno/loader-referencia.md: bucle de 1 s lineal, retrasos 0 / 0,3 / 0,6 s y los
 * mismos fotogramas clave. Las distancias, pensadas para una caja de 100 px a escala 0,5, se
 * calculan sobre el tamaño real (unidad = lado / 100), así vale en los tres tamaños.
 * Todo en el hilo de UI (Reanimated). Con «reducir movimiento», una sola pieza que respira.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

/**
 * Estrella de 5 puntas, maciza, en una caja de 100 × 100 (el símbolo de VeoVeo: valorar).
 * Radio interior generoso (0,5 del exterior) para que a 16-22 px siga leyéndose como estrella;
 * las esquinas se redondean con un trazo del mismo color y unión redonda.
 */
function caminoEstrella(): string {
  const cx = 50;
  const cy = 53;
  const exterior = 44;
  const interior = 22;
  const puntos = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? exterior : interior;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${puntos.join('L')}Z`;
}
const ESTRELLA = caminoEstrella();

const COLORES = {
  turquesa: { relleno: '#69DFD9', brillo: '#69DFD933' },
  morado: { relleno: '#5c3d99', brillo: '#5c3d9933' },
} as const;
export type ColorLoader = keyof typeof COLORES;

const PASOS = [0, 0.25, 0.5, 0.75, 1];
// Fotogramas clave del original, por pieza: escala, giro (grados), Y y X (px de la caja de 100)
const PIEZAS = [
  {
    retraso: 0,
    escala: [0.5, 0.75, 1, 0.5, 0],
    giro: [0, 0, 0, 0, 0],
    y: [-200, -100, 0, 50, 100],
    x: [0, 0, 0, 0, 0],
  },
  {
    retraso: 0.3,
    escala: [0.5, 1, 1, 0.5, 0],
    giro: [-10, -5, 0, 5, 10],
    y: [-200, -100, 0, 50, 100],
    x: [-100, -50, -25, 0, 25],
  },
  {
    retraso: 0.6,
    escala: [0.5, 1, 1, 0.5, 0],
    giro: [10, 5, 0, -5, -10],
    y: [-200, -100, 0, 50, 100],
    x: [100, 50, 25, 0, -25],
  },
];
const OPACIDAD = [0, 1, 1, 1, 0];

function Silueta({
  color,
  lado,
  propio,
}: {
  color: ColorLoader;
  lado: number;
  /** Color propio (dentro de un botón de color), en vez del de la paleta del loader */
  propio?: string;
}) {
  const relleno = propio ?? COLORES[color].relleno;
  const brillo = propio ? 'transparent' : COLORES[color].brillo;
  return (
    <Svg width={lado} height={lado} viewBox="0 0 100 100">
      {/* Halo (el drop-shadow del original) detrás de la estrella */}
      <Path d={ESTRELLA} fill="none" stroke={brillo} strokeWidth={22} strokeLinejoin="round" />
      {/* Relleno + trazo del mismo color con unión redonda: esquinas suaves, que no pinchen */}
      <Path d={ESTRELLA} fill={relleno} stroke={relleno} strokeWidth={9} strokeLinejoin="round" />
    </Svg>
  );
}

function Pieza({
  indice,
  tiempo,
  arranque,
  lado,
  color,
  propio,
}: {
  indice: number;
  tiempo: SharedValue<number>;
  arranque: SharedValue<number>;
  lado: number;
  color: ColorLoader;
  propio?: string;
}) {
  const p = PIEZAS[indice];
  const u = lado / 100;
  const estilo = useAnimatedStyle(() => {
    // Antes de su retraso, la primera vuelta no se ve (como animation-delay)
    const empezada = arranque.value >= p.retraso;
    const fase = (((tiempo.value - p.retraso) % 1) + 1) % 1;
    return {
      opacity: empezada ? interpolate(fase, PASOS, OPACIDAD) : 0,
      transform: [
        { scale: interpolate(fase, PASOS, p.escala) },
        { rotate: `${interpolate(fase, PASOS, p.giro)}deg` },
        { translateY: interpolate(fase, PASOS, p.y) * u },
        { translateX: interpolate(fase, PASOS, p.x) * u },
      ],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilo]} pointerEvents="none">
      <Silueta color={color} lado={lado} propio={propio} />
    </Animated.View>
  );
}

export function LoaderCaida({
  lado,
  color,
  propio,
}: {
  lado: number;
  color: ColorLoader;
  propio?: string;
}) {
  const reducir = useReducedMotion();
  const tiempo = useSharedValue(0);
  const arranque = useSharedValue(0);
  const respiro = useSharedValue(1);

  useEffect(() => {
    if (reducir) {
      respiro.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
      );
      return;
    }
    tiempo.value = 0;
    tiempo.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, false);
    arranque.value = withTiming(1, { duration: 1000, easing: Easing.linear });
  }, [reducir, tiempo, arranque, respiro]);

  const estiloRespiro = useAnimatedStyle(() => ({ opacity: respiro.value }));

  if (reducir) {
    return (
      <Animated.View style={[{ width: lado, height: lado }, estiloRespiro]}>
        <Silueta color={color} lado={lado} propio={propio} />
      </Animated.View>
    );
  }
  return (
    <View style={{ width: lado, height: lado }}>
      {PIEZAS.map((_, i) => (
        <Pieza
          key={i}
          indice={i}
          tiempo={tiempo}
          arranque={arranque}
          lado={lado}
          color={color}
          propio={propio}
        />
      ))}
    </View>
  );
}
