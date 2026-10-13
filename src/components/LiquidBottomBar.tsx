import React, { useEffect } from 'react';
import { StyleSheet, View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

const BAR_HEIGHT = 64;

type Props = {
  onTabChange: (index: number) => void;
  paginaActual: number;
};

export function LiquidBottomBar({ onTabChange, paginaActual }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const items = [
    { iconActive: 'compass', iconInactive: 'compass-outline', index: 0 },
    { iconActive: 'library', iconInactive: 'library-outline', index: 1 },
    { iconActive: 'people', iconInactive: 'people-outline', index: 2 },
  ] as const;

  // Ancho dinámico con límite para escritorio
  const BAR_WIDTH = Math.min(windowWidth - 48, 600);
  const TAB_WIDTH = BAR_WIDTH / items.length;

  const translateX = useSharedValue(paginaActual * TAB_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(paginaActual * TAB_WIDTH, {
      damping: 25,
      stiffness: 200,
      mass: 0.5,
    });
  }, [paginaActual, TAB_WIDTH]);

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
          left: (windowWidth - BAR_WIDTH) / 2, // Centrado perfecto
        },
      ]}
    >
      {/* 🔮 Real Android Blur Strategy: experimentalBlurMethod="dimezisBlurView" */}
      <BlurView
        intensity={80}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      >
        <View style={styles.glassOverlay} />
      </BlurView>

      <View style={styles.content}>
        {/* 💊 Premium Pill Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            { width: TAB_WIDTH * 0.8, left: (TAB_WIDTH - TAB_WIDTH * 0.8) / 2 },
            indicatorStyle,
          ]}
        />

        {items.map((item) => {
          const isActive = paginaActual === item.index;
          return (
            <Pressable
              key={item.index}
              onPress={() => onTabChange(item.index)}
              style={styles.tabBtn}
              hitSlop={8}
            >
              <Ionicons
                name={isActive ? item.iconActive : item.iconInactive}
                size={26}
                color={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'}
              />
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
    left: 24,
    right: 24,
    height: BAR_HEIGHT,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // Casi invisible, solo blur
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 22,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
