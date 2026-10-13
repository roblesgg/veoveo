import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../theme/colors';

export function SplashView({ fontFamily = 'System' }: { fontFamily?: string }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const letterSpacing = useSharedValue(2);

  useEffect(() => {
    // Initial entrance
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.5)) });
    letterSpacing.value = withTiming(8, { duration: 1200 });

    // Subtle breathing loop after entrance
    setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }, 1200);
  }, []);

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    letterSpacing: letterSpacing.value,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1e1b4b']} style={StyleSheet.absoluteFill} />

      <Animated.View style={styles.content}>
        <Animated.Text style={[styles.text, animatedTextStyle, { fontFamily }]}>
          VEOVEO
        </Animated.Text>
        <View style={styles.accentLineContainer}>
          <Animated.View style={[styles.accentLine, { opacity: 0.3 }]} />
        </View>
        <Animated.Text style={[styles.betaText, animatedTextStyle, { fontFamily }]}>
          BETA
        </Animated.Text>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: 40 }]}>
        <Text style={[styles.footerText, { fontFamily }]}>DE DRIPDEV</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 48,
    color: '#fff',
    textTransform: 'uppercase',
  },
  betaText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 4,
    opacity: 0.6,
  },
  accentLineContainer: {
    marginTop: 12,
    width: 60,
    height: 2,
    alignItems: 'center',
  },
  accentLine: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
