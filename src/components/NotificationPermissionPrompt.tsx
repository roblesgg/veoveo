import React, { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { EXPO_PROJECT_ID } from '../services/notificationService';

const STORAGE_KEY = 'veoveo_notif_prompt_seen';

type Props = { onTokenRegistered?: (token: string) => void };

export function NotificationPermissionPrompt({ onTokenRegistered }: Props) {
  const [visible, setVisible] = useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void check();
  }, []);

  async function check() {
    try {
      const seen = await AsyncStorage.getItem(STORAGE_KEY);
      if (seen) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        await AsyncStorage.setItem(STORAGE_KEY, '1');
        return;
      }
      // Mostrar prompt después de 1.5s para que el usuario vea la app primero
      setTimeout(() => {
        setVisible(true);
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }, 1500);
    } catch {}
  }

  async function handleAllow() {
    setVisible(false);
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
        onTokenRegistered?.(tokenData.data);
      } catch {}
    }
  }

  async function dismiss() {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setVisible(false),
    );
  }

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="box-none">
      <View style={styles.card}>
        <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={32} color="#38bdf8" />
          </View>
          <Text style={styles.title}>Activa las notificaciones</Text>
          <Text style={styles.body}>
            Entérate cuando un amigo quiere hacer match contigo, te manda un mensaje o hay una nueva versión disponible.
          </Text>
          <Pressable style={styles.btnAllow} onPress={handleAllow}>
            <Text style={styles.btnAllowText}>Permitir notificaciones</Text>
          </Pressable>
          <Pressable style={styles.btnSkip} onPress={dismiss}>
            <Text style={styles.btnSkipText}>Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 40,
    zIndex: 99998,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(10,15,35,0.5)',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  btnAllow: {
    width: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnAllowText: { color: '#000', fontSize: 16, fontWeight: '800' },
  btnSkip: { paddingVertical: 8 },
  btnSkipText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
