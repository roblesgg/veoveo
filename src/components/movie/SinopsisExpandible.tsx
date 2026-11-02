/**
 * Sinopsis de la ficha: tres líneas y «Ver más» / «Ver menos» que abre y cierra con animación.
 * Mide el texto entero con una copia invisible para saber hasta dónde crecer y si hace falta el botón.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Pulsable } from '../common/Pulsable';

const ALTO_LINEA = 24;
const ALTO_CERRADO = ALTO_LINEA * 3;

export function SinopsisExpandible({
  texto,
  fontFamily,
  colorEnlace,
}: {
  texto: string;
  fontFamily?: string;
  colorEnlace: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const [altoTotal, setAltoTotal] = useState(0);
  const reducir = useReducedMotion();
  const alto = useSharedValue(ALTO_CERRADO);

  const cabe = altoTotal > 0 && altoTotal <= ALTO_CERRADO + 1;
  const destino =
    abierta && altoTotal > 0 ? altoTotal : Math.min(ALTO_CERRADO, altoTotal || ALTO_CERRADO);

  useEffect(() => {
    alto.value = reducir
      ? destino
      : withTiming(destino, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [alto, destino, reducir]);

  const estiloAlto = useAnimatedStyle(() => ({ height: alto.value }));

  return (
    <View style={styles.bloque}>
      {/* Copia invisible: da el alto real del texto entero */}
      <View
        style={styles.medida}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          style={[styles.texto, { fontFamily }]}
          onLayout={(e) => setAltoTotal(Math.ceil(e.nativeEvent.layout.height))}
        >
          {texto}
        </Text>
      </View>

      <Animated.View style={[styles.recorte, estiloAlto]}>
        <Text style={[styles.texto, { fontFamily }]}>{texto}</Text>
      </Animated.View>

      {!cabe && altoTotal > 0 && (
        <Pulsable
          onPress={() => setAbierta((v) => !v)}
          hitSlop={10}
          style={styles.boton}
          accessibilityRole="button"
          accessibilityState={{ expanded: abierta }}
        >
          <Text style={[styles.enlace, { fontFamily, color: colorEnlace }]}>
            {abierta ? 'Ver menos' : 'Ver más'}
          </Text>
        </Pulsable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { marginBottom: 24 },
  medida: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  recorte: { overflow: 'hidden' },
  texto: { color: '#cbd5e1', fontSize: 15, lineHeight: ALTO_LINEA },
  boton: { alignSelf: 'flex-start', marginTop: 6 },
  enlace: { fontSize: 14, fontWeight: '700' },
});
