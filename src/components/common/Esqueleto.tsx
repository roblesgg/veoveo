/**
 * Esqueletos de carga: el hueco con la forma real del contenido, con puntitos y destellos blancos
 * que aparecen y se desvanecen escalonados, como si el cartel se estuviera generando.
 * Animación en el hilo de UI (un valor compartido para todos los puntos de un hueco; cada punto
 * lleva su fase). Con «reducir movimiento», hueco fijo sin puntos.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Destello } from './Destello';

type Props = {
  ancho: DimensionValue;
  alto?: DimensionValue;
  aspecto?: number;
  radio?: number;
  style?: StyleProp<ViewStyle>;
};

/** Puntos por hueco (pocos: hay muchos huecos a la vez en los carruseles) */
const PUNTOS = 9;
const CICLO_MS = 2200;

type Punto = { x: number; y: number; tam: number; fase: number; destello: boolean };

/** Reparto repetible (sin azar entre pintados) para que no parpadee al volver a pintarse. */
function crearPuntos(semilla: number): Punto[] {
  let s = semilla * 9301 + 49297;
  const azar = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: PUNTOS }, (_, i) => ({
    x: 0.08 + azar() * 0.84,
    y: 0.08 + azar() * 0.84,
    tam: i % 3 === 0 ? 14 : 3 + azar() * 3,
    fase: i / PUNTOS + azar() * 0.08,
    destello: i % 3 === 0,
  }));
}

function PuntoBrillante({ p, tiempo }: { p: Punto; tiempo: SharedValue<number> }) {
  const estilo = useAnimatedStyle(() => {
    const t = (tiempo.value + p.fase) % 1;
    // Aparece, se queda un momento y se desvanece; crece un poco al aparecer
    const brillo = interpolate(t, [0, 0.25, 0.5, 1], [0, 1, 0.55, 0]);
    return { opacity: brillo, transform: [{ scale: 0.6 + brillo * 0.5 }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.punto,
        { left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: p.tam, height: p.tam },
        estilo,
      ]}
    >
      {p.destello ? (
        <Destello lado={p.tam} color="rgba(255,255,255,0.75)" />
      ) : (
        <View style={styles.bola} />
      )}
    </Animated.View>
  );
}

let contador = 0;

export function Esqueleto({ ancho, alto, aspecto, radio = 16, style }: Props) {
  const reducir = useReducedMotion();
  const tiempo = useSharedValue(0);
  // Cada hueco con su propio reparto; los huecos no se mueven al unísono
  const [semilla] = useState(() => ++contador);
  const puntos = useMemo(() => crearPuntos(semilla), [semilla]);

  useEffect(() => {
    if (reducir) return;
    tiempo.value = (semilla % 7) / 7; // arrancan desfasados
    tiempo.value = withRepeat(withTiming(1, { duration: CICLO_MS, easing: Easing.linear }), -1);
  }, [reducir, tiempo, semilla]);

  return (
    <View
      style={[
        styles.hueco,
        { width: ancho, height: alto, aspectRatio: aspecto, borderRadius: radio },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {!reducir && puntos.map((p, i) => <PuntoBrillante key={i} p={p} tiempo={tiempo} />)}
    </View>
  );
}

/** Fila de pósters vacíos para un carrusel que está cargando. */
export function EsqueletoFilaPosters({
  cantidad = 4,
  ancho = 130,
}: {
  cantidad?: number;
  ancho?: number;
}) {
  return (
    <View style={styles.fila}>
      {Array.from({ length: cantidad }, (_, i) => (
        <Esqueleto key={i} ancho={ancho} aspecto={2 / 3} />
      ))}
    </View>
  );
}

/** Rejilla de pósters vacíos (Biblioteca). */
export function EsqueletoRejillaPosters({ cantidad = 9 }: { cantidad?: number }) {
  return (
    <View style={styles.rejilla}>
      {Array.from({ length: cantidad }, (_, i) => (
        <View key={i} style={styles.celda}>
          <Esqueleto ancho="100%" aspecto={2 / 3} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hueco: { backgroundColor: '#1E293B', overflow: 'hidden' },
  punto: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bola: {
    width: '100%',
    height: '100%',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  fila: { flexDirection: 'row', gap: 14, paddingHorizontal: 25 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: '33.33%', padding: 4 },
});
