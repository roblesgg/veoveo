/**
 * Base de todas las hojas que suben desde abajo: el fondo se funde y la hoja sube con un muelle;
 * sale por el mismo borde; se cierra arrastrándola hacia abajo (por distancia o por velocidad).
 * Interrumpible y en el hilo de UI. Con «reducir movimiento», solo fundidos.
 * La altura se mide en píxeles (en la arquitectura antigua, translate en % cierra la app).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SALIDA = Easing.bezier(0.23, 1, 0.32, 1);

type Props = {
  visible: boolean;
  onCerrar: () => void;
  children: ReactNode;
};

export function HojaBase({ visible, onCerrar, children }: Props) {
  const { height: altoPantalla } = useWindowDimensions();
  const reducir = useReducedMotion();
  // Montada mientras se ve o mientras sale (para poder animar la salida)
  const [montada, setMontada] = useState(visible);
  const alto = useSharedValue(altoPantalla);
  const y = useSharedValue(altoPantalla);
  const fondo = useSharedValue(0);
  // Entra una sola vez por apertura (onLayout también salta si el contenido cambia de tamaño)
  const entrada = useRef(false);

  const entrar = (medida: number) => {
    alto.value = medida;
    if (!visible || entrada.current) return;
    entrada.current = true;
    fondo.value = withTiming(1, { duration: 200 });
    if (reducir) {
      y.value = 0;
      return;
    }
    y.value = medida;
    y.value = withSpring(0, { duration: 300, dampingRatio: 0.85 });
  };

  useEffect(() => {
    if (visible) {
      entrada.current = false;
      // Si se reabre mientras salía, ya está medida y onLayout no vuelve a saltar: entra ya
      if (montada) entrar(alto.value);
      else setMontada(true);
      return;
    }
    if (!montada) return;
    // Salida por el mismo borde, y luego se desmonta
    fondo.value = withTiming(0, { duration: 200 });
    y.value = withTiming(
      reducir ? 0 : alto.value,
      { duration: reducir ? 150 : 220, easing: SALIDA },
      (fin) => {
        if (fin) runOnJS(setMontada)(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const arrastre = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      // Hacia abajo sigue al dedo; hacia arriba, con resistencia
      y.value = e.translationY > 0 ? e.translationY : e.translationY * 0.15;
    })
    .onEnd((e) => {
      if (e.translationY > alto.value * 0.3 || e.velocityY > 900) {
        runOnJS(onCerrar)();
      } else {
        y.value = withSpring(0, { duration: 300, dampingRatio: 0.85, velocity: e.velocityY });
      }
    });

  const estiloFondo = useAnimatedStyle(() => ({ opacity: fondo.value }));
  const estiloHoja = useAnimatedStyle(() =>
    reducir ? { opacity: fondo.value } : { transform: [{ translateY: y.value }] },
  );

  if (!montada) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.fondo, estiloFondo]}>
          <Pressable style={styles.flex} onPress={onCerrar} accessibilityLabel="Cerrar" />
        </Animated.View>
        <KeyboardAvoidingView behavior="padding" style={styles.zona} pointerEvents="box-none">
          <GestureDetector gesture={arrastre}>
            <Animated.View style={estiloHoja} onLayout={(e) => entrar(e.nativeEvent.layout.height)}>
              {children}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fondo: { backgroundColor: 'rgba(2,6,23,0.65)' },
  zona: { flex: 1, justifyContent: 'flex-end' },
});
