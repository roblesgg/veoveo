import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { obtenerActividadAmigosPelicula } from '../../services/repositorioSocial';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type Props = {
  movieId: number;
  fontFamily: string;
};

export function MovieSocialProof({ movieId, fontFamily }: Props) {
  const navigation = useNavigation<any>();
  const [actividad, setActividad] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await obtenerActividadAmigosPelicula(movieId);
        if (active) setActividad(res);
      } catch (e) {
        console.error('Error fetching social proof:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [movieId]);

  if (loading)
    return <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginVertical: 20 }} />;
  if (actividad.length === 0) return null;

  const vistas = actividad.filter((a) => a.estado === 'vista');
  const porVer = actividad.filter((a) => a.estado === 'por_ver');

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { fontFamily }]}>Actividad de Amigos</Text>

      {vistas.length > 0 && (
        <View style={styles.row}>
          <Text style={[styles.subTitle, { fontFamily }]}>Vistas ({vistas.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {vistas.map((a) => (
              <Pressable
                key={a.uid}
                style={styles.chip}
                onPress={() => navigation.navigate('BibliotecaAmigo', { amigoUid: a.uid })}
              >
                <BlurView intensity={30} tint="dark" style={styles.chipInner}>
                  {a.foto ? (
                    <Image source={{ uri: a.foto }} style={styles.foto} />
                  ) : (
                    <View style={styles.fotoPlaceholder}>
                      <Ionicons name="person" size={14} color="#fff" />
                    </View>
                  )}
                  <Text style={[styles.username, { fontFamily }]}>{a.username}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#FFD700" />
                    <Text style={[styles.ratingText, { fontFamily }]}>{a.valoracion}</Text>
                  </View>
                </BlurView>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {porVer.length > 0 && (
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={[styles.subTitle, { fontFamily }]}>
            En lista de pendientes ({porVer.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {porVer.map((a) => (
              <Pressable
                key={a.uid}
                style={styles.chip}
                onPress={() => navigation.navigate('BibliotecaAmigo', { amigoUid: a.uid })}
              >
                <BlurView intensity={20} tint="dark" style={styles.chipInner}>
                  {a.foto ? (
                    <Image source={{ uri: a.foto }} style={styles.foto} />
                  ) : (
                    <View style={styles.fotoPlaceholder}>
                      <Ionicons name="person" size={14} color="#fff" />
                    </View>
                  )}
                  <Text style={[styles.username, { fontFamily }]}>{a.username}</Text>
                  <Ionicons name="bookmark" size={12} color="#38bdf8" style={{ marginLeft: 4 }} />
                </BlurView>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 24 },
  sectionTitle: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
    marginBottom: 16,
  },
  row: { marginBottom: 4 },
  subTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scroll: { gap: 10, paddingRight: 20 },
  chip: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  foto: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  fotoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: { color: '#fff', fontSize: 13, fontWeight: '600' },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  ratingText: { color: '#FFD700', fontSize: 11, fontWeight: '800', marginLeft: 2 },
});
