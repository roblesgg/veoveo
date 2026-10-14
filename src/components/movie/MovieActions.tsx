import React, { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, GLASS } from '../../theme/colors';
import { SHADOWS } from '../../theme/theme';

import { Cargando } from '../common/Cargando';
import { Pulsable } from '../common/Pulsable';

type Props = {
  user: any;
  estadoPelicula: 0 | 1 | 2;
  accionBib: boolean;
  bibCargando: boolean;
  onPorVer: () => void;
  onVista: () => void;
  fontFamily: string;
};

export const MovieActions = React.memo(
  ({ user, estadoPelicula, accionBib, bibCargando, onPorVer, onVista, fontFamily }: Props) => {
    const reducir = useReducedMotion();
    // El icono entra con un pequeño rebote al cambiar de estado (no al abrir la ficha)
    const anterior = useRef(estadoPelicula);
    const cambiado = anterior.current !== estadoPelicula;
    useEffect(() => {
      if (anterior.current !== estadoPelicula && estadoPelicula !== 0) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      anterior.current = estadoPelicula;
    }, [estadoPelicula]);
    const entrada = !cambiado
      ? undefined
      : reducir
        ? FadeIn.duration(160)
        : ZoomIn.springify().damping(12).stiffness(260).mass(0.6);
    return (
      <View style={[styles.actionsGlass, SHADOWS.mac]}>
        <BlurView
          intensity={80}
          style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden', zIndex: -1 }]}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(15, 23, 42, 0.05)', borderRadius: 28, zIndex: -1 },
          ]}
        />

        <View style={[styles.actionsInner, { zIndex: 1 }]}>
          {!user ? (
            <Text style={styles.aviso}>Inicia sesión para guardar en tu biblioteca.</Text>
          ) : bibCargando ? (
            <View style={{ marginVertical: 12 }}>
              <Cargando tamano="mediano" />
            </View>
          ) : (
            <View style={styles.rowBotones}>
              <Pulsable
                style={[styles.btnBib, estadoPelicula === 1 && styles.btnBibActivo]}
                onPress={onPorVer}
                disabled={accionBib}
              >
                <Animated.View key={`pv-${estadoPelicula === 1}`} entering={entrada}>
                  <Ionicons
                    name={estadoPelicula === 1 ? 'checkmark' : 'add'}
                    size={18}
                    color={estadoPelicula === 1 ? COLORS.background : COLORS.primary}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.btnBibText,
                    {
                      fontFamily,
                      color: estadoPelicula === 1 ? COLORS.background : COLORS.primary,
                    },
                  ]}
                >
                  {estadoPelicula === 1 ? 'En Por Ver' : 'Por Ver'}
                </Text>
              </Pulsable>
              <Pulsable
                style={[styles.btnBib, estadoPelicula === 2 && styles.btnBibVista]}
                onPress={onVista}
                disabled={accionBib}
              >
                <Animated.View key={`v-${estadoPelicula === 2}`} entering={entrada}>
                  <Ionicons
                    name={estadoPelicula === 2 ? 'checkmark-circle' : 'eye-outline'}
                    size={18}
                    color={estadoPelicula === 2 ? COLORS.background : COLORS.success}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.btnBibText,
                    {
                      fontFamily,
                      color: estadoPelicula === 2 ? COLORS.background : COLORS.success,
                    },
                  ]}
                >
                  {estadoPelicula === 2 ? 'Vista' : 'Vista'}
                </Text>
              </Pulsable>
            </View>
          )}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  actionsGlass: {
    borderRadius: 28,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  actionsInner: { padding: 20 },
  rowBotones: { flexDirection: 'row', gap: 12 },
  btnBib: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  btnBibActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  btnBibVista: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  btnBibText: { fontSize: 14, fontWeight: '600' },
  aviso: { color: '#ffcc80', marginVertical: 12, fontSize: 14, textAlign: 'center' },
});
