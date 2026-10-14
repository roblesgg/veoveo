/**
 * Estrellas para valorar: se tocan o se arrastra el dedo por la fila y se van llenando.
 * - La que está bajo el dedo crece (1,25) mientras arrastras; al soltar, todas se asientan.
 * - Las que se llenan dan un pequeño rebote escalonado (30 ms entre una y otra).
 * - Un toque háptico ligero al pasar a otra estrella (es una decisión, no un roce).
 * Todo en el hilo de UI e interrumpible. Con «reducir movimiento», sin escalas: solo cambia el color.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const ORO = '#FFD700';
const TAMANO = 36;
const HUECO = 8;

function Estrella({
  n,
  llena,
  rebote,
  valor,
  arrastrando,
  reducir,
}: {
  n: number;
  llena: boolean;
  rebote: SharedValue<number>;
  valor: SharedValue<number>;
  arrastrando: SharedValue<boolean>;
  reducir: boolean;
}) {
  const estilo = useAnimatedStyle(() => {
    if (reducir) return {};
    const bajoElDedo = arrastrando.value && valor.value === n;
    return {
      transform: [
        {
          scale:
            rebote.value * withSpring(bajoElDedo ? 1.25 : 1, { duration: 260, dampingRatio: 0.7 }),
        },
      ],
    };
  });
  return (
    <Animated.View style={[styles.estrella, estilo]}>
      <Ionicons
        name={llena ? 'star' : 'star-outline'}
        size={TAMANO}
        color={llena ? ORO : 'rgba(255,255,255,0.2)'}
      />
    </Animated.View>
  );
}

export function EstrellasValorar({
  valor,
  onCambio,
}: {
  /** 0 = sin estrellas */
  valor: number;
  onCambio: (n: number) => void;
}) {
  const reducir = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const actual = useSharedValue(valor);
  const arrastrando = useSharedValue(false);
  // Solo el dedo (o el lector de pantalla) avisa de un cambio; si viene de fuera, no se devuelve
  const porGesto = useSharedValue(false);

  useEffect(() => {
    porGesto.value = false;
    actual.value = valor;
  }, [valor, actual, porGesto]);
  const rebotes = [
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
  ];

  // De la posición del dedo a 1–5
  const aEstrella = (x: number) => {
    'worklet';
    if (ancho <= 0) return 1;
    return Math.min(5, Math.max(1, Math.ceil((x / ancho) * 5)));
  };

  const vibrar = () => void Haptics.selectionAsync();

  // Al cambiar el número: háptico, avisar fuera y rebote escalonado de las que se llenan
  useAnimatedReaction(
    () => actual.value,
    (ahora, antes) => {
      if (antes === null || ahora === antes || !porGesto.value) return;
      runOnJS(vibrar)();
      runOnJS(onCambio)(ahora);
      if (reducir || ahora < antes) return;
      for (let i = Math.max(antes, 0); i < ahora; i++) {
        rebotes[i].value = withDelay(
          (i - Math.max(antes, 0)) * 30,
          withSequence(
            withTiming(1.18, { duration: 90 }),
            withSpring(1, { duration: 260, dampingRatio: 0.55 }),
          ),
        );
      }
    },
    [ancho, reducir],
  );

  const gesto = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      porGesto.value = true;
      arrastrando.value = true;
      actual.value = aEstrella(e.x);
    })
    .onUpdate((e) => {
      actual.value = aEstrella(e.x);
    })
    .onFinalize(() => {
      arrastrando.value = false;
    });

  return (
    <GestureHandlerRootView style={styles.raiz}>
      <GestureDetector gesture={gesto}>
        <View
          style={styles.fila}
          onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Nota"
          accessibilityValue={{ min: 0, max: 5, now: valor }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const n =
              e.nativeEvent.actionName === 'increment'
                ? Math.min(5, valor + 1)
                : Math.max(1, valor - 1);
            porGesto.value = true;
            actual.value = n;
          }}
        >
          {[1, 2, 3, 4, 5].map((n, i) => (
            <Estrella
              key={n}
              n={n}
              llena={n <= valor}
              rebote={rebotes[i]}
              valor={actual}
              arrastrando={arrastrando}
              reducir={reducir}
            />
          ))}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  raiz: { flexGrow: 0, alignSelf: 'center', marginBottom: 24 },
  fila: { flexDirection: 'row', gap: HUECO },
  estrella: { padding: 4 },
});
