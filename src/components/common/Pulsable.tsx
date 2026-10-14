/**
 * Pressable que contesta al tocarlo: se hunde a 0,97 en cuanto el dedo apoya (respuesta al tocar,
 * no al soltar) y vuelve con un muelle. En el hilo de UI e interrumpible: si se vuelve a tocar a
 * mitad, retoma desde donde esté. Con «reducir movimiento», sin escala (solo baja un poco la opacidad).
 * Se usa igual que Pressable (mismas props); `style` admite objeto o lista, no función.
 */
import { forwardRef } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const PressableAnimado = Animated.createAnimatedComponent(Pressable);
const HUNDIR = Easing.bezier(0.23, 1, 0.32, 1);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Cuánto se hunde (0,97 por defecto; 0,94 para botones grandes y redondos) */
  escalaPulsado?: number;
};

export const Pulsable = forwardRef<View, Props>(function Pulsable(
  { style, escalaPulsado = 0.97, onPressIn, onPressOut, ...resto },
  ref,
) {
  const reducir = useReducedMotion();
  const escala = useSharedValue(1);
  const estilo = useAnimatedStyle(() =>
    reducir ? { opacity: escala.value < 1 ? 0.85 : 1 } : { transform: [{ scale: escala.value }] },
  );
  return (
    <PressableAnimado
      ref={ref}
      {...resto}
      pressRetentionOffset={resto.pressRetentionOffset ?? 16}
      onPressIn={(e) => {
        escala.value = withTiming(escalaPulsado, { duration: 120, easing: HUNDIR });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        escala.value = withSpring(1, { duration: 300, dampingRatio: 0.7 });
        onPressOut?.(e);
      }}
      style={[style, estilo]}
    />
  );
});
