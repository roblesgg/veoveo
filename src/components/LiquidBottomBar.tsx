import React, { useEffect } from 'react';
import { StyleSheet, View, Pressable, Platform, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { IconCompass, IconMessageCircle, IconUsers } from '@tabler/icons-react-native';
import { IconoClaqueta } from './iconos/IconosPropios';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';

// Solo iconos: la cabecera de cada pantalla ya dice dónde estás. La etiqueta queda para lectores de pantalla.
const BAR_HEIGHT = 58;

type Props = {
  onTabChange: (index: number) => void;
  paginaActual: number;
  /** Mensajes sin leer, para el contador de Chats */
  noLeidos?: number;
};

type Pestana = {
  index: number;
  etiqueta: string;
  Icono: (p: { size: number; color: string; strokeWidth: number }) => React.ReactNode;
};

const PESTANAS: Pestana[] = [
  { index: 0, etiqueta: 'Descubrir', Icono: (p) => <IconCompass {...p} /> },
  { index: 1, etiqueta: 'Biblioteca', Icono: (p) => <IconoClaqueta {...p} /> },
  { index: 2, etiqueta: 'Chats', Icono: (p) => <IconMessageCircle {...p} /> },
  { index: 3, etiqueta: 'Social', Icono: (p) => <IconUsers {...p} /> },
];

export function LiquidBottomBar({ onTabChange, paginaActual, noLeidos = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  // Ancho dinámico con límite para escritorio
  const BAR_WIDTH = Math.min(windowWidth - 40, 600);
  const TAB_WIDTH = BAR_WIDTH / PESTANAS.length;

  const translateX = useSharedValue(paginaActual * TAB_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(paginaActual * TAB_WIDTH, {
      damping: 25,
      stiffness: 200,
      mass: 0.5,
    });
  }, [paginaActual, TAB_WIDTH, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          bottom: Platform.OS === 'web' ? Math.max(insets.bottom, 40) : Math.max(insets.bottom, 20),
          width: BAR_WIDTH,
          left: (windowWidth - BAR_WIDTH) / 2,
        },
      ]}
      accessibilityRole="tablist"
    >
      <BlurView
        intensity={80}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      >
        <View style={styles.glassOverlay} />
      </BlurView>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.indicator,
            { width: TAB_WIDTH * 0.7, left: (TAB_WIDTH - TAB_WIDTH * 0.7) / 2 },
            indicatorStyle,
          ]}
        />

        {PESTANAS.map(({ index, etiqueta, Icono }) => {
          const activa = paginaActual === index;
          const color = activa ? COLORS.primary : 'rgba(148,163,184,0.75)';
          return (
            <Pressable
              key={index}
              onPress={() => onTabChange(index)}
              style={styles.tabBtn}
              hitSlop={8}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={
                index === 2 && noLeidos > 0 ? `${etiqueta}, ${noLeidos} sin leer` : etiqueta
              }
            >
              <View>
                {Icono({ size: activa ? 27 : 25, color, strokeWidth: activa ? 2.2 : 1.8 })}
                {index === 2 && noLeidos > 0 && (
                  <View style={styles.contador}>
                    <Text style={styles.contadorTexto}>{noLeidos > 99 ? '99+' : noLeidos}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    height: BAR_HEIGHT,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    zIndex: 1000,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    height: 44,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    borderRadius: 999,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  contador: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { color: COLORS.onAccent, fontSize: 10, fontFamily: FUENTES.titulo },
});
