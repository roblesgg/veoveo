import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isStandalone = (navigator as any).standalone === true;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari && !isStandalone;
}

const STORAGE_KEY = 'veoveo_ios_prompt_dismissed';

export function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isIOSSafari()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.card}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.row}>
            <Ionicons name="phone-portrait-outline" size={28} color="#38bdf8" />
            <View style={styles.textWrap}>
              <Text style={styles.title}>Añadir a inicio</Text>
              <Text style={styles.body}>
                Instala VeoVeo como app: pulsa{' '}
                <Ionicons name="share-outline" size={14} color="#38bdf8" /> y luego{' '}
                <Text style={styles.bold}>«Añadir a pantalla de inicio»</Text>
              </Text>
            </View>
            <Pressable onPress={dismiss} hitSlop={12} style={styles.close}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
          <View style={styles.arrow} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute' as any,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 24,
    zIndex: 9999,
    pointerEvents: 'box-none' as any,
  },
  card: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  content: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  textWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  body: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 },
  bold: { color: '#fff', fontWeight: '700' },
  close: { paddingTop: 2 },
  arrow: {
    alignSelf: 'center',
    marginTop: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
});
