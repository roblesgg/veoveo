/**
 * ARCHIVO: screens/ActorScreen.tsx
 * DESCRIPCIÓN: Pantalla de detalle de un actor o profesional del cine.
 * Muestra la biografía del artista y su filmografía completa (sacada de TMDB).
 * Permite filtrar las películas del actor por género cinematográfico y ordenarlas.
 */

import React, { useState, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActorData } from '../hooks/movie/useActorData';
import { useMontserrat } from '../theme/useMontserrat';
import { GradientBackground } from '../components/GradientBackground';
import { ActorHeader } from '../components/movie/ActorHeader';
import { FilterSortMenu, type FilterSortOption } from '../components/FilterSortMenu';
import { posterUrl } from '../services/tmdbClient';
import { SHADOWS } from '../theme/theme';
import { shareActor } from '../utils/shareUtils';
import { Cargando } from '../components/common/Cargando';
import { EstadoError, EstadoVacio } from '../components/common/EstadoPantalla';
import type { RootStackParamList } from '../navigation/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 74) / 3; // Cálculo para mostrar 3 columnas exactas

// Mapeo manual de IDs de TMDB a nombres en español (Fallback)
const GENRE_MAP: Record<number, string> = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia ficción',
  10770: 'Película de TV',
  53: 'Suspense',
  10752: 'Bélica',
  37: 'Western',
};

export function ActorScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Actor'>>();
  const { actorId } = route.params;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { fontFamily: ff } = useMontserrat();
  const fontFamily = ff || 'System';

  // HOOK: Obtiene biografía, fotos y filmografía desde TMDB
  const { detalles, peliculas, cargando, error, recargar } = useActorData(actorId);

  const [filtroGenero, setFiltroGenero] = useState<number | null>(null);
  const [orden, setOrden] = useState<'popularity' | 'date'>('popularity');
  const [mostrarMenu, setMostrarMenu] = useState(false);

  /** 🧠 PROCESAMIENTO DINÁMICO:
   * Extrae todos los géneros únicos presentes en la filmografía del actor
   * para construir dinámicamente las opciones del filtro.
   */
  const generosOpciones = useMemo(() => {
    const set = new Set<number>();
    peliculas.forEach((p) => p.genre_ids?.forEach((g: number) => set.add(g)));
    const options: FilterSortOption[] = [
      { label: 'Todos los géneros', value: 0, icon: 'apps-outline' },
    ];
    Array.from(set).forEach((gid) => {
      if (GENRE_MAP[gid]) options.push({ label: GENRE_MAP[gid], value: gid, icon: 'film-outline' });
    });
    return options;
  }, [peliculas]);

  /** Aplica el filtrado y ordenación sobre la filmografía */
  const pelisFiltradas = useMemo(() => {
    const base = [...peliculas];
    if (orden === 'date')
      base.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
    else base.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    if (!filtroGenero || filtroGenero === 0) return base;
    return base.filter((p) => p.genre_ids?.includes(filtroGenero));
  }, [peliculas, filtroGenero, orden]);

  if (cargando) {
    return (
      <GradientBackground style={styles.center}>
        <Cargando />
      </GradientBackground>
    );
  }

  if (error && !detalles) {
    return (
      <GradientBackground style={styles.center}>
        <EstadoError onReintentar={recargar} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {/* BOTONES DE NAVEGACIÓN Y TOOLS */}
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.navBtn, { left: 20, top: Math.max(insets.top, 12) }]}
          >
            <BlurView intensity={30} tint="dark" style={styles.btnInner}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </BlurView>
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              position: 'absolute',
              right: 20,
              top: Math.max(insets.top, 12),
              gap: 10,
            }}
          >
            <Pressable onPress={() => shareActor(actorId, detalles?.name || 'Actor')}>
              <BlurView intensity={30} tint="dark" style={styles.btnInner}>
                <Ionicons name="share-social-outline" size={20} color="#fff" />
              </BlurView>
            </Pressable>

            <Pressable onPress={() => navigation.popToTop()}>
              <BlurView intensity={30} tint="dark" style={styles.btnInner}>
                <Ionicons name="home-outline" size={20} color="#fff" />
              </BlurView>
            </Pressable>
          </View>

          {/* Icono de filtros flotante (derecha centro) */}
          <Pressable
            onPress={() => setMostrarMenu(true)}
            style={[styles.navBtn, { right: 20, top: Math.max(insets.top, 12) + 50 }]}
          >
            <BlurView intensity={30} tint="dark" style={styles.btnInner}>
              <Ionicons name="options-outline" size={20} color="#fff" />
            </BlurView>
          </Pressable>

          {/* CABECERA: Foto circular y nombre */}
          <ActorHeader
            foto={detalles?.profile_path ?? undefined}
            nombre={detalles?.name ?? ''}
            lugarNacimiento={detalles?.place_of_birth ?? undefined}
            fontFamily={fontFamily}
          />
        </View>

        {/* BLOQUE: Biografía glaseada */}
        {detalles?.biography && (
          <View style={styles.bioBox}>
            <BlurView intensity={15} tint="dark" style={styles.glassCard}>
              <Text style={[styles.secTitle, { fontFamily }]}>Biografía</Text>
              <Text style={[styles.bioText, { fontFamily }]} numberOfLines={6}>
                {detalles.biography}
              </Text>
            </BlurView>
          </View>
        )}

        {/* LISTADO: Filmografía destacada (Grid de 3 columnas) */}
        <View style={styles.filmography}>
          <Text style={[styles.secTitle, { fontFamily, marginLeft: 25, marginBottom: 15 }]}>
            Filmografía destacada
          </Text>
          {pelisFiltradas.length === 0 ? (
            <EstadoVacio titulo="No hay películas" texto="Prueba con otro filtro." />
          ) : (
            <FlatList
              data={pelisFiltradas}
              keyExtractor={(item) => String(item.id)}
              numColumns={3}
              scrollEnabled={false} // Se desplaza con el ScrollView padre
              contentContainerStyle={styles.list}
              renderItem={({ item: p }) => (
                <Pressable
                  style={[styles.card, SHADOWS.macLight]}
                  onPress={() => navigation.push('Pelicula', { movieId: p.id })}
                >
                  {p.poster_path ? (
                    <Image
                      source={{ uri: posterUrl(p.poster_path, 'w342')! }}
                      style={styles.poster}
                    />
                  ) : (
                    <View style={styles.noPoster}>
                      <Text style={[styles.noPosterText, { fontFamily }]}>{p.title}</Text>
                    </View>
                  )}
                </Pressable>
              )}
              columnWrapperStyle={styles.row}
            />
          )}
        </View>
      </ScrollView>

      {/* MENÚ: Filtrado por Géneros y Ordenación */}
      <FilterSortMenu
        visible={mostrarMenu}
        onClose={() => setMostrarMenu(false)}
        title="Ordenar por"
        options={[
          {
            label: 'Popularidad',
            value: 'popularity',
            icon: 'trending-up-outline',
            description: 'Películas más exitosas del actor.',
          },
          {
            label: 'Fecha de estreno',
            value: 'date',
            icon: 'calendar-outline',
            description: 'Más recientes primero.',
          },
        ]}
        currentValue={orden}
        onSelect={setOrden}
        filterTitle="Filtrar por género"
        filters={generosOpciones}
        currentFilter={filtroGenero || 0}
        onSelectFilter={(v) => setFiltroGenero(v === 0 ? null : v)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 40, alignItems: 'center', marginBottom: 20 },
  navBtn: { position: 'absolute', zIndex: 10 },
  btnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  bioBox: { paddingHorizontal: 20, marginBottom: 30 },
  glassCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  secTitle: { fontSize: 18, color: 'rgba(255,255,255,0.95)', fontWeight: '700', marginBottom: 10 },
  bioText: { fontSize: 14, color: '#cbd5e1', lineHeight: 20 },
  filmography: { flex: 1 },
  list: { paddingHorizontal: 25 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  poster: { width: '100%', height: '100%' },
  noPoster: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 },
  noPosterText: { color: '#fff', fontSize: 10, textAlign: 'center' },
});
