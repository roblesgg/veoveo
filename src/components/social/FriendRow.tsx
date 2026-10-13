/**
 * ARCHIVO: components/social/FriendRow.tsx
 * DESCRIPCIÓN: Fila individual para la lista de amigos.
 * Muestra el avatar, el nombre de usuario y el estado de conexión (Online/Offline).
 * Utilizado en la pestaña Social y en selectores de amigos.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { UsuarioPerfil } from '../../types';

type Props = {
  amigo: UsuarioPerfil;
  onPress: () => void;
  fontFamily: string;
};

export const FriendRow = React.memo(({ amigo, onPress, fontFamily }: Props) => {
  /** Lógica cromática del estado de presencia */
  const statusColor =
    amigo.estado === 'online' ? '#7CFC9A' : amigo.estado === 'ausente' ? '#FFB74D' : '#9E9E9E';

  return (
    <View style={styles.container}>
      <Pressable style={styles.main} onPress={onPress}>
        {/* AVATAR: Con caché de ExpoImage o inicial de respaldo */}
        <View style={styles.avatar}>
          {amigo.fotoPerfil && amigo.fotoPerfil.trim() !== '' ? (
            <ExpoImage
              source={{ uri: amigo.fotoPerfil }}
              style={styles.avatarImg}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Text style={styles.avatarText}>{(amigo.username || 'U').charAt(0).toUpperCase()}</Text>
          )}
        </View>

        {/* INFORMACIÓN DE USUARIO */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { fontFamily }]} numberOfLines={1}>
            {amigo.username || amigo.email}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.status, { fontFamily, color: 'rgba(255,255,255,0.4)' }]}>
              {amigo.estado === 'online'
                ? 'En línea'
                : amigo.estado === 'ausente'
                  ? 'Ausente'
                  : 'Desconectado'}
            </Text>
          </View>
        </View>

        {/* FEEDBACK DE INTERACCIÓN */}
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  name: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontSize: 12, fontWeight: '500' },
});
