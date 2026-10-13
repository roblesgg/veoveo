import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { abrirEnlaceAviso } from '../utils/enlaces';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  body: string;
  url?: string;
  onDismiss: () => void;
};

export function InAppNotificationBanner({ title, body, url, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    timer.current = setTimeout(dismiss, 6000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const dismiss = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(onDismiss);
  };

  const handlePress = () => {
    if (url) abrirEnlaceAviso(url);
    dismiss();
  };

  return (
    <Animated.View
      style={[styles.wrapper, { top: insets.top + 8, transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <Pressable onPress={handlePress} style={styles.pressable}>
        <BlurView intensity={85} tint="dark" style={styles.blur}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications" size={20} color="#38bdf8" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.body} numberOfLines={2}>
                {body}
              </Text>
            </View>
            <Pressable onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
  },
  pressable: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  blur: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  body: { color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 17 },
  closeBtn: { padding: 4 },
});
