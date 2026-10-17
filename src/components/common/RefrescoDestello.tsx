/**
 * Tirar hacia abajo para refrescar con NUESTRO loader (los destellos que caen) en vez del círculo
 * del sistema.
 *
 * Cómo: el RefreshControl sigue siendo el del sistema (es el que da el gesto y el rebote
 * nativos, sin rehacer el desplazamiento de cada lista), pero se le quita el color para que no
 * pinte nada, y encima se dibuja el loader. Aparece y crece con lo que se arrastra, y se queda
 * mientras recarga. Con «reducir movimiento», aparece sin escalarse.
 */
import { useEffect, type ReactElement } from 'react';
import { RefreshControl, StyleSheet, View, type RefreshControlProps } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Cargando } from './Cargando';

/**
 * Para la lista: devuelve el valor del arrastre y el manejador que hay que pasarle.
 * Va en el hilo de UI: la lista no se vuelve a pintar al desplazarse.
 */
export function useArrastreRefresco() {
  const arrastre = useSharedValue(0);
  const alDesplazar = useAnimatedScrollHandler({
    onScroll: (e) => {
      arrastre.value = e.contentOffset.y;
    },
  });
  return { arrastre, alDesplazar };
}

/** Lo que hay que arrastrar para que el sistema dispare el refresco (dp) */
const DISPARO = 64;
const TRANSPARENTE = 'transparent';

/**
 * El control para `refreshControl`: da el gesto, pero no pinta nada.
 */
export function RefrescoDestello({
  refrescando,
  onRefrescar,
  ...resto
}: {
  refrescando: boolean;
  onRefrescar: () => void;
} & Partial<RefreshControlProps>): ReactElement {
  return (
    <RefreshControl
      {...resto}
      refreshing={refrescando}
      onRefresh={onRefrescar}
      // Sin color: el sistema no pinta su círculo, pero el gesto sigue siendo el suyo
      colors={[TRANSPARENTE]}
      tintColor={TRANSPARENTE}
      progressBackgroundColor={TRANSPARENTE}
      style={styles.invisible}
    />
  );
}

/** El loader que se ve al tirar. Va dentro de la pantalla, por encima de la lista. */
export function DestelloRefresco({
  refrescando,
  arrastre,
  arriba = 0,
}: {
  refrescando: boolean;
  arrastre: SharedValue<number>;
  /** Separación desde arriba (cabecera, barra de estado…) */
  arriba?: number;
}) {
  const reducir = useReducedMotion();
  const visible = useSharedValue(0);
  useEffect(() => {
    visible.value = withTiming(refrescando ? 1 : 0, { duration: 160 });
  }, [refrescando, visible]);

  const estilo = useAnimatedStyle(() => {
    // Al tirar: 0 → 1 según lo arrastrado. Mientras recarga: siempre a tamaño completo.
    const porArrastre = interpolate(-arrastre.value, [8, DISPARO], [0, 1], Extrapolation.CLAMP);
    const p = Math.max(porArrastre, visible.value);
    return {
      opacity: p,
      transform: reducir ? [] : [{ scale: 0.7 + p * 0.3 }],
    };
  });

  return (
    <Animated.View style={[styles.zona, { top: arriba }, estilo]} pointerEvents="none">
      <View style={styles.hueco}>
        <Cargando tamano="mediano" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  invisible: { backgroundColor: 'transparent' },
  zona: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  // Los destellos caen desde arriba: hace falta sitio por encima de donde se paran
  hueco: { height: 92, justifyContent: 'flex-end' },
});
