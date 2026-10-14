/**
 * Copia del cartel que crece desde su sitio en una lista hasta la portada grande de la ficha, y
 * vuelve. La mueve un único progreso (0 = en la lista, 1 = portada) que también funde el fondo y
 * el contenido de la ficha, así todo va a la vez. Esquinas de 16 (como en la lista) a 0 (portada).
 * Misma imagen (w342, ya en caché del carrusel) y mismo recorte «cover» que origen y destino.
 * Es un elemento absoluto fuera del flujo: animar su caja no recoloca nada más.
 */
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { posterUrl } from '../../services/tmdbClient';
import type { Rect } from '../../utils/zoomCartel';

const RADIO_LISTA = 16;

type Props = {
  origen: Rect;
  destino: Rect;
  poster: string | null;
  progreso: SharedValue<number>;
};

export function ZoomCartel({ origen, destino, poster, progreso }: Props) {
  const estilo = useAnimatedStyle(() => {
    const p = progreso.value;
    return {
      left: origen.x + (destino.x - origen.x) * p,
      top: origen.y + (destino.y - origen.y) * p,
      width: origen.width + (destino.width - origen.width) * p,
      height: origen.height + (destino.height - origen.height) * p,
      borderRadius: RADIO_LISTA * (1 - p),
    };
  });

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
  cartel: { position: 'absolute', overflow: 'hidden', zIndex: 50, elevation: 50 },
});
