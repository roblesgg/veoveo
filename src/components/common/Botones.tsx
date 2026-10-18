/**
 * Botones y segmentos de toda la app (una sola forma de hacerlo).
 * - BotonPrincipal: píldora de 52 de alto, celeste (o en «peligro», rojo; o «secundario», de
 *   cristal), con Pulsable de serie (se hunde al tocar) y el loader pequeño mientras espera.
 * - Segmentos: control de opciones excluyentes (píldora con la opción activa en celeste).
 */
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';
import { Cargando } from './Cargando';
import { Pulsable } from './Pulsable';

type Variante = 'principal' | 'secundario' | 'peligro';

export function BotonPrincipal({
  texto,
  onPress,
  variante = 'principal',
  cargando,
  desactivado,
  icono,
  estilo,
  etiqueta,
}: {
  texto: string;
  onPress: () => void;
  variante?: Variante;
  /** Muestra el loader pequeño y no deja pulsar */
  cargando?: boolean;
  desactivado?: boolean;
  icono?: ReactNode;
  estilo?: StyleProp<ViewStyle>;
  /** Etiqueta de accesibilidad si el texto no basta */
  etiqueta?: string;
}) {
  const colorTexto =
    variante === 'principal' ? COLORS.onAccent : variante === 'peligro' ? '#fff' : COLORS.text;
  return (
    <Pulsable
      onPress={onPress}
      disabled={desactivado || cargando}
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? texto}
      accessibilityState={{ disabled: desactivado || cargando, busy: cargando }}
      style={[
        styles.boton,
        variante === 'principal' && styles.principal,
        variante === 'secundario' && styles.secundario,
        variante === 'peligro' && styles.peligro,
        desactivado && !cargando && styles.apagado,
        estilo,
      ]}
    >
      {cargando ? (
        <Cargando tamano="pequeno" color={colorTexto} />
      ) : (
        <View style={styles.fila}>
          {icono}
          <Text style={[styles.texto, { color: colorTexto }]} numberOfLines={1}>
            {texto}
          </Text>
        </View>
      )}
    </Pulsable>
  );
}

export function Segmentos<T extends string | boolean>({
  opciones,
  valor,
  onCambio,
  estilo,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  estilo?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmentos, estilo]} accessibilityRole="radiogroup">
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pulsable
            key={String(o.valor)}
            onPress={() => onCambio(o.valor)}
            style={[styles.segmento, activo && styles.segmentoOn]}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
          >
            <Text
              style={[styles.segmentoTexto, activo && styles.segmentoTextoOn]}
              numberOfLines={1}
            >
              {o.texto}
            </Text>
          </Pulsable>
        );
      })}
    </View>
  );
}

const ALTO_OPCION = 52;

/**
 * Opciones excluyentes apiladas en vertical, dentro de una pastilla de cristal. Un deslizador
 * (también de cristal, en turquesa de marca) se mueve con un muelle con rebote hasta la opción
 * elegida. Inspirado en el selector de cristal de Uiverse (_1380), adaptado a nuestros colores.
 * Todo en el hilo de UI; con «reducir movimiento», el deslizador salta sin muelle.
 */
export function SegmentosVertical<T extends string | boolean>({
  opciones,
  valor,
  onCambio,
  estilo,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  estilo?: StyleProp<ViewStyle>;
}) {
  const reducir = useReducedMotion();
  const indice = Math.max(
    0,
    opciones.findIndex((o) => o.valor === valor),
  );
  const posicion = useSharedValue(indice);
  useEffect(() => {
    posicion.value = reducir ? indice : withSpring(indice, { duration: 420, dampingRatio: 0.62 });
  }, [indice, reducir, posicion]);

  const estiloDeslizador = useAnimatedStyle(() => ({
    transform: [{ translateY: posicion.value * ALTO_OPCION }],
  }));

  return (
    <View style={[styles.vertical, estilo]} accessibilityRole="radiogroup">
      <Animated.View style={[styles.deslizador, estiloDeslizador]} pointerEvents="none" />
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pulsable
            key={String(o.valor)}
            onPress={() => onCambio(o.valor)}
            style={styles.opcionVertical}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
          >
            <Text
              style={[styles.opcionVerticalTexto, activo && styles.opcionVerticalTextoOn]}
              numberOfLines={1}
            >
              {o.texto}
            </Text>
          </Pulsable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  vertical: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  deslizador: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ALTO_OPCION,
    borderRadius: 18,
    backgroundColor: 'rgba(105,223,217,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(105,223,217,0.55)',
  },
  opcionVertical: {
    height: ALTO_OPCION,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  opcionVerticalTexto: { color: COLORS.textMuted, fontSize: 16, fontFamily: FUENTES.seminegrita },
  opcionVerticalTextoOn: { color: '#fff' },
  boton: {
    height: 52,
    borderRadius: 999,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  principal: { backgroundColor: COLORS.primary },
  secundario: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  peligro: { backgroundColor: COLORS.error },
  apagado: { opacity: 0.4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  texto: { fontSize: 16, fontFamily: FUENTES.titulo },
  segmentos: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  segmento: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentoOn: { backgroundColor: COLORS.primary },
  segmentoTexto: { color: COLORS.text, fontSize: 14, fontFamily: FUENTES.texto },
  segmentoTextoOn: { color: COLORS.onAccent, fontFamily: FUENTES.titulo },
});
