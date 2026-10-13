/**
 * Aviso de "sin conexión" arriba de la pantalla. Mientras tanto la app sigue enseñando lo que
 * tiene en caché (TanStack Query persistida y caché de Firestore); al volver la red, se avisa
 * a TanStack Query para que recargue lo pendiente.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconWifiOff } from '@tabler/icons-react-native';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';

// TanStack Query sabe si hay red (pausa peticiones sin conexión y las repite al volver)
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((estado) => setOnline(estado.isConnected !== false)),
);

export function AvisoSinConexion() {
  const insets = useSafeAreaInsets();
  const [sinRed, setSinRed] = useState(false);

  useEffect(
    () =>
      NetInfo.addEventListener((estado) =>
        // isInternetReachable puede ser null al principio: solo se avisa si es false seguro
        setSinRed(estado.isConnected === false || estado.isInternetReachable === false),
      ),
    [],
  );

  if (!sinRed) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.aviso, { top: insets.top + 6 }]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <IconWifiOff size={16} color={COLORS.onAccent} strokeWidth={2.2} />
      <Text style={styles.texto}>Sin conexión. Te enseñamos lo que ya tenías.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  texto: { color: COLORS.onAccent, fontSize: 13, fontFamily: FUENTES.seminegrita },
});
