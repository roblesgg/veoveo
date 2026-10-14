/**
 * Loader de marca: la tapa de la claqueta se cierra de golpe con un pequeño rebote.
 * Es el indicador de carga de toda la app, en tres tamaños: «pequeno» (dentro de botones y filas),
 * «mediano» (secciones) y «grande» (pantalla completa). Donde ya se sabe la forma de lo que viene
 * (carruseles, biblioteca) se usan esqueletos (Esqueleto.tsx), no esto.
 * Va en el hilo de UI (Reanimated). Con «reducir movimiento», solo respira (fundido).
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';

const GAnimado = Animated.createAnimatedComponent(G);

const TAMANOS = { pequeno: 22, mediano: 48, grande: 88 } as const;

type Props = {
  texto?: string;
  tamano?: number | keyof typeof TAMANOS;
  /** Color del trazo (por defecto turquesa; dentro de un botón turquesa, el de su texto) */
  color?: string;
};

export function LoaderClaqueta({ texto, tamano = 'grande', color = COLORS.accent }: Props) {
  const lado = typeof tamano === 'number' ? tamano : TAMANOS[tamano];
  // En pequeño el trazo es más grueso para que se lea
  const trazo = lado < 32 ? 5 : 3;
  const reducir = useReducedMotion();
  const angulo = useSharedValue(-22);
  const opacidad = useSharedValue(1);

  useEffect(() => {
    if (reducir) {
      opacidad.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
      );
      return;
    }
    // Abierta → golpe seco (cierra) → pequeño rebote → pausa → vuelve a abrir
    const curva = Easing.bezier(0.2, 0.8, 0.2, 1.2);
    angulo.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 260, easing: curva }),
        withTiming(-4, { duration: 90 }),
        withTiming(0, { duration: 90 }),
        withDelay(260, withTiming(-22, { duration: 360, easing: Easing.out(Easing.cubic) })),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  }, [reducir, angulo, opacidad]);

  const propsTapa = useAnimatedProps(() => ({
    rotation: angulo.value,
  }));
  const estiloRespirar = useAnimatedStyle(() => ({ opacity: opacidad.value }));

  return (
    <View
      style={styles.contenedor}
      accessibilityRole="progressbar"
      accessibilityLabel={texto ?? 'Cargando'}
    >
      <Animated.View style={estiloRespirar}>
        <Svg
          width={lado}
          height={lado}
          viewBox="0 0 64 64"
          fill="none"
          stroke={color}
          strokeWidth={trazo}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Rect x={6} y={28} width={52} height={28} rx={5} />
          <Path d="M6 40h52" />
          <GAnimado animatedProps={propsTapa} originX={6} originY={26}>
            <Path d="M6 26h48v-6H6z" />
            <Path d="M16 26l6-6M28 26l6-6M40 26l6-6" />
          </GAnimado>
        </Svg>
      </Animated.View>
      {texto ? <Text style={styles.texto}>{texto}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  texto: { color: COLORS.textMuted, fontSize: 14, fontFamily: FUENTES.texto },
});
