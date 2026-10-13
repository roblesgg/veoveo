import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { profileUrl } from '../../services/tmdbClient';
import { SHADOWS } from '../../theme/theme';

type Props = {
  foto: string | undefined;
  nombre: string | undefined;
  lugarNacimiento: string | undefined;
  fontFamily: string;
};

export const ActorHeader = React.memo(({ foto, nombre, lugarNacimiento, fontFamily }: Props) => {
  return (
    <View style={styles.container}>
      <View style={[styles.photoContainer, SHADOWS.macLight]}>
        <Image
          source={{ uri: profileUrl(foto, 'h632') || 'https://via.placeholder.com/200x300?text=No+Photo' }}
          style={styles.photo}
        />
      </View>
      <Text style={[styles.name, { fontFamily }]}>{nombre}</Text>
      {lugarNacimiento && <Text style={[styles.birth, { fontFamily }]}>{lugarNacimiento}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 20 },
  photoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  photo: { width: '100%', height: '100%' },
  name: { fontSize: 28, color: '#fff', fontWeight: '800', textAlign: 'center' },
  birth: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
});
