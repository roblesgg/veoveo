/**
 * Copia del cartel que vuela entre su sitio en una lista y la cabecera de la ficha.
 * «ida»: del origen al destino; «vuelta»: del destino al origen. Muelles cortos y en el hilo de UI.
 * Es un elemento absoluto fuera del flujo: animar su caja no recoloca nada más.
 */
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { posterUrl } from '../../services/tmdbClient';
import type { Rect } from '../../utils/zoomCartel';

type Props = {
  origen: Rect;
  destino: Rect;
  poster: string | null;
  fase: 'ida' | 'vuelta';
  onFin: (fase: 'ida' | 'vuelta') => void;
};

export function ZoomCartel({ origen, destino, poster, fase, onFin }: Props) {
  const desde = fase === 'ida' ? origen : destino;
  const hasta = fase === 'ida' ? destino : origen;
  const x = useSharedValue(desde.x);
  const y = useSharedValue(desde.y);
  const ancho = useSharedValue(desde.width);
  const alto = useSharedValue(desde.height);

  useEffect(() => {
    const muelle =
      fase === 'ida'
        ? { duration: 420, dampingRatio: 0.86 }
        : { duration: 380, dampingRatio: 0.92 };
    x.value = desde.x;
    y.value = desde.y;
    ancho.value = desde.width;
    alto.value = desde.height;
    x.value = withSpring(hasta.x, muelle, (fin) => {
      if (fin) runOnJS(onFin)(fase);
    });
    y.value = withSpring(hasta.y, muelle);
    ancho.value = withSpring(hasta.width, muelle);
    alto.value = withSpring(hasta.height, muelle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const estilo = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: ancho.value,
    height: alto.value,
  }));

  return (
    <Animated.View style={[styles.cartel, estilo]} pointerEvents="none">
      <Image
        source={{ uri: posterUrl(poster, 'w342') ?? undefined }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cartel: {
    position: 'absolute',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 50,
  },
});
