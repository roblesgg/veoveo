import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, GLASS } from '../../theme/colors';
import { SHADOWS } from '../../theme/theme';

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
            <ActivityIndicator color="#fff" style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.rowBotones}>
              <Pressable
                style={[styles.btnBib, estadoPelicula === 1 && styles.btnBibActivo]}
                onPress={onPorVer}
                disabled={accionBib}
              >
                <Ionicons
                  name={estadoPelicula === 1 ? 'checkmark' : 'add'}
                  size={18}
                  color={estadoPelicula === 1 ? COLORS.background : COLORS.primary}
                />
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
              </Pressable>
              <Pressable
                style={[styles.btnBib, estadoPelicula === 2 && styles.btnBibVista]}
                onPress={onVista}
                disabled={accionBib}
              >
                <Ionicons
                  name={estadoPelicula === 2 ? 'checkmark-circle' : 'eye-outline'}
                  size={18}
                  color={estadoPelicula === 2 ? COLORS.background : COLORS.success}
                />
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
              </Pressable>
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
