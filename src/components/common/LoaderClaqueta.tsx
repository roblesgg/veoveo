/**
 * Loader de marca: la tapa de la claqueta se cierra de golpe con un pequeño rebote.
 * SOLO para esperas a pantalla completa (arranque, preparar el Movie Match).
 * En listas y carruseles se usan esqueletos (Esqueleto.tsx).
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

type Props = { texto?: string; tamano?: number };

export function LoaderClaqueta({ texto, tamano = 88 }: Props) {
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
    <View style={styles.contenedor} accessibilityRole="progressbar" accessibilityLabel={texto ?? 'Cargando'}>
      <Animated.View style={estiloRespirar}>
        <Svg width={tamano} height={tamano} viewBox="0 0 64 64" fill="none" stroke={COLORS.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
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
  contenedor: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  texto: { color: COLORS.textMuted, fontSize: 14, fontFamily: FUENTES.texto },
});
