import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  TextInput, 
  FlatList, 
  ActivityIndicator 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { listarPeliculasPorEstado } from '../../services/repositorioPeliculasUsuario';
import { posterUrl, tmdbApi } from '../../services/tmdbClient';
import { PeliculaUsuario, Movie } from '../../types';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/theme';

type Props = {
  visible: boolean;
  mode: 'vista' | 'por_ver' | 'explorar' | null;
  onClose: () => void;
  onSelect: (movie: { id: number; title: string; posterPath: string }) => void;
  fontFamily: string;
};

export const ChatMoviePicker = ({ visible, mode, onClose, onSelect, fontFamily }: Props) => {
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible && mode && mode !== 'explorar') {
      loadLocalMovies(mode === 'vista' ? 'vista' : 'por_ver');
    } else {
      setMovies([]);
      setSearch('');
    }
  }, [visible, mode]);

  const loadLocalMovies = async (estado: 'por_ver' | 'vista') => {
    setLoading(true);
    try {
      const res = await listarPeliculasPorEstado(estado);
      setMovies(res.map(m => ({
        id: m.idPelicula,
        title: m.titulo,
        posterPath: m.rutaPoster
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await tmdbApi.buscarPeliculas(search);
      setMovies(res.results.map((m: Movie) => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable style={styles.movieItem} onPress={() => onSelect(item)}>
      <ExpoImage 
        source={{ uri: posterUrl(item.posterPath, 'w185') ?? undefined }}
        style={styles.poster} 
        contentFit="cover"
        transition={200}
      />
      <Text style={[styles.movieTitle, { fontFamily }]} numberOfLines={2}>{item.title}</Text>
    </Pressable>
  );

  const title = mode === 'vista' ? 'Mis Vistas' : mode === 'por_ver' ? 'Mi Lista por Ver' : 'Explorar Películas';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <BlurView intensity={90} tint="dark" experimentalBlurMethod="dimezisBlurView" style={styles.modal}>
          <View style={styles.header}>
            <Text style={[styles.title, { fontFamily }]}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {mode === 'explorar' && (
            <View style={styles.searchBox}>
              <TextInput
                style={[styles.input, { fontFamily }]}
                placeholder="Buscar película..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearch}
              />
              <Pressable onPress={handleSearch} style={styles.searchBtn}>
                <Ionicons name="search" size={20} color="#fff" />
              </Pressable>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={movies}
              renderItem={renderItem}
              keyExtractor={item => String(item.id)}
              numColumns={3}
              contentContainerStyle={styles.list}
              columnWrapperStyle={styles.columnWrapper}
              ListEmptyComponent={
                <Text style={[styles.empty, { fontFamily }]}>
                  {mode === 'explorar' ? 'Busca algo para compartir' : 'No hay películas en esta lista'}
                </Text>
              }
            />
          )}
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { 
    height: '80%', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, color: '#fff' },
  searchBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 40 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
  movieItem: { width: '31%', alignItems: 'center' },
  poster: { width: '100%', aspectRatio: 2/3, borderRadius: 12, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  movieTitle: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  empty: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40, fontSize: 16 }
});
