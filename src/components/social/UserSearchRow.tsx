import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  usuario: { uid: string; username?: string; email?: string; fotoPerfil?: string };
  enviada: boolean;
  onAdd: () => void;
  fontFamily: string;
};

export const UserSearchRow = React.memo(({ usuario, enviada, onAdd, fontFamily }: Props) => {
  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <View style={styles.avatar}>
          {usuario.fotoPerfil && usuario.fotoPerfil.trim() !== '' ? (
            <Image source={{ uri: usuario.fotoPerfil }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {(usuario.username || 'U').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={[styles.name, { fontFamily }]}>{usuario.username || usuario.email}</Text>
      </View>
      <Pressable
        style={[styles.addBtn, enviada && styles.disabled]}
        disabled={enviada}
        onPress={onAdd}
      >
        <Ionicons name={enviada ? 'checkmark' : 'person-add'} size={18} color="#020617" />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 24 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  addBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#69DFD9',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' },
});
