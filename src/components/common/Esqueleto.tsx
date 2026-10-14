/**
 * Esqueletos de carga: huecos con la forma real del contenido y un brillo que pasa.
 * Se perciben más rápidos que un indicador giratorio. Animación en el hilo de UI;
 * con «reducir movimiento», hueco fijo sin brillo.
 */
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  ancho: DimensionValue;
  alto?: DimensionValue;
  aspecto?: number;
  radio?: number;
  style?: StyleProp<ViewStyle>;
};

export function Esqueleto({ ancho, alto, aspecto, radio = 16, style }: Props) {
  const reducir = useReducedMotion();
  const avance = useSharedValue(0);
  // Ancho medido: translateX en porcentaje no existe en la arquitectura antigua de RN (cierra la app)
  const anchoReal = useSharedValue(0);

  useEffect(() => {
    if (reducir) return;
    avance.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.linear }), -1);
  }, [reducir, avance]);

  const estiloBrillo = useAnimatedStyle(() => ({
    transform: [{ translateX: (-1 + avance.value * 2) * anchoReal.value }],
  }));

  return (
    <View
      onLayout={(e) => {
        anchoReal.value = e.nativeEvent.layout.width;
      }}
      style={[styles.hueco, { width: ancho, height: alto, aspectRatio: aspecto, borderRadius: radio }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {!reducir && (
        <Animated.View style={[StyleSheet.absoluteFill, estiloBrillo]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/** Fila de pósters vacíos para un carrusel que está cargando. */
export function EsqueletoFilaPosters({ cantidad = 4, ancho = 130 }: { cantidad?: number; ancho?: number }) {
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
  fila: { flexDirection: 'row', gap: 14, paddingHorizontal: 25 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: '33.33%', padding: 4 },
});
