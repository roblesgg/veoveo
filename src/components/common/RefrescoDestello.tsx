/**
 * Tirar hacia abajo para refrescar, a nuestra manera y sin el círculo con flecha de Android
 * (ese se dibuja aunque le quites el color: por eso no se usa RefreshControl).
 *
 * Mientras arrastras baja UNA estrella, que gira y crece con el recorrido. Al soltar, si has
 * bajado lo suficiente, se queda arriba y arranca la animación de las tres estrellas cayendo
 * (nuestro loader) hasta que termina la recarga.
 *
 * El gesto va en el hilo de UI y solo actúa cuando la lista está arriba del todo; si no, deja
 * pasar el desplazamiento normal.
 */
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Cargando, COLOR_DESTELLO } from './Cargando';
import { Destello } from './Destello';

/** Lo que hay que bajar para que se dispare la recarga (dp) */
const DISPARO = 78;
/** Más allá de esto el dedo deja de arrastrar (resistencia) */
const TOPE = 150;
const ESTRELLA = 34;
/** Alto de la caja del loader (las estrellas caen desde arriba y se paran abajo) */
const ALTO_LOADER = 92;

/** Para la lista: el valor del desplazamiento y el manejador que hay que pasarle. */
export function useArrastreRefresco() {
  const desplazamiento = useSharedValue(0);
  const alDesplazar = useAnimatedScrollHandler({
    onScroll: (e) => {
      desplazamiento.value = e.contentOffset.y;
    },
  });
  return { desplazamiento, alDesplazar };
}

/**
 * Envuelve la lista (o lo que se desplace) y añade el gesto de tirar para refrescar.
 * `desplazamiento` viene de `useArrastreRefresco` y evita que el gesto se active a media lista.
 */
export function TirarParaRefrescar({
  refrescando,
  onRefrescar,
  desplazamiento,
  arriba = 0,
  children,
}: {
  refrescando: boolean;
  onRefrescar: () => void;
  desplazamiento: SharedValue<number>;
  /** Separación desde arriba (cabecera, barra de estado…) */
  arriba?: number;
  children: ReactNode;
}) {
  const reducir = useReducedMotion();
  const tirado = useSharedValue(0);
  const cargando = useSharedValue(0);

  useEffect(() => {
    cargando.value = withTiming(refrescando ? 1 : 0, { duration: 180 });
    if (!refrescando) tirado.value = withTiming(0, { duration: 220 });
  }, [refrescando, cargando, tirado]);

  const gesto = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetY(-12)
    .onUpdate((e) => {
      // Solo desde arriba del todo y mientras no esté ya recargando
      if (desplazamiento.value > 2 || refrescando) return;
      // Resistencia: cuanto más bajas, menos sigue al dedo
      tirado.value = Math.min(TOPE, e.translationY * 0.55);
    })
    .onEnd(() => {
      if (refrescando) return;
      if (tirado.value >= DISPARO) {
        tirado.value = withTiming(DISPARO, { duration: 160 });
        runOnJS(onRefrescar)();
      } else {
        tirado.value = withTiming(0, { duration: 220 });
      }
    });

  // La estrella que baja con el dedo: se ve mientras arrastras, no mientras recarga
  const estiloEstrella = useAnimatedStyle(() => {
    const p = interpolate(tirado.value, [0, DISPARO], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: p * (1 - cargando.value),
      transform: [
        { translateY: tirado.value - ESTRELLA },
        { scale: reducir ? 1 : 0.5 + p * 0.5 },
        { rotate: reducir ? '0deg' : `${tirado.value * 2.2}deg` },
      ],
    };
  });

  // Las tres estrellas cayendo (el loader), ya soltado y recargando. Caen justo donde estaba la
  // estrella que bajaba con el dedo: el loader es más alto, así que se sube su altura.
  const estiloLoader = useAnimatedStyle(() => ({
    opacity: cargando.value,
    transform: [{ translateY: tirado.value - ALTO_LOADER + ESTRELLA / 2 }],
  }));

  // El contenido NO se mueve: arriba del todo no hay nada más que enseñar, así que solo baja
  // la estrella (y luego el loader)
  return (
    <View style={styles.flex}>
      <View style={[styles.zona, { top: arriba }]} pointerEvents="none">
        <Animated.View style={estiloEstrella}>
          <Destello lado={ESTRELLA} color={COLOR_DESTELLO} />
        </Animated.View>
        <Animated.View style={[styles.loader, estiloLoader]}>
          <Cargando tamano="mediano" />
        </Animated.View>
      </View>
      <GestureDetector gesture={gesto}>
        <View style={styles.flex}>{children}</View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  zona: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  // Los destellos caen desde arriba: hace falta sitio por encima de donde se paran
  loader: { position: 'absolute', height: ALTO_LOADER, justifyContent: 'flex-end' },
});
