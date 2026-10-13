import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { posterUrl } from '../../services/tmdbClient';
import type { Movie } from '../../types';
import { RatingBadge } from '../RatingBadge';
import { marcarHito } from '../../utils/medicionArranque';
import { usePlataformasPelicula } from '../../hooks/useDescubrir';

type Props = {
  /** `motivo` solo en "Recomendado para ti": se enseña debajo del póster. */
  item: Movie & { motivo?: string };
  onPeliculaClick: (id: number) => void;
  misPlataformas?: number[];
  libraryMap?: { [id: number]: { estado: 'por_ver' | 'vista', valoracion: number } };
};

export const PosterItem = memo(({ item, onPeliculaClick, misPlataformas = [], libraryMap = {} }: Props) => {
  // Solo se piden las plataformas de la peli si el usuario ha elegido las suyas en Ajustes.
  const { data: providers } = usePlataformasPelicula(item.id, misPlataformas.length > 0);
  const isFlatrate = providers?.flatrate.some((p) => misPlataformas.includes(p));
  const isRent = !isFlatrate && providers?.rent.some((p) => misPlataformas.includes(p));
  const uri = posterUrl(item.poster_path, 'w342');

  return (
    <View style={styles.posterWrapper}>
      <Pressable
        onPress={() => onPeliculaClick(item.id)}
        style={({ pressed }) => [styles.posterCard, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.posterImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={String(item.id)}
            transition={150}
            onLoad={() => marcarHito('primera carátula pintada')}
          />
        ) : (
          <View style={[styles.posterImg, styles.posterFallback]}>
            <Ionicons name="film-outline" size={32} color="rgba(255,255,255,0.1)" />
            <Text style={styles.fallbackText}>{item.title}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={StyleSheet.absoluteFill}
        />

        {(isFlatrate || isRent) && (
          <View style={[styles.dot, { backgroundColor: isFlatrate ? '#2ecc71' : '#f39c12' }]} />
        )}

        {libraryMap[item.id]?.estado === 'vista' ? (
          <RatingBadge rating={libraryMap[item.id].valoracion} hideText />
        ) : libraryMap[item.id]?.estado === 'por_ver' ? (
          <View style={styles.eyeBadge}>
            <Ionicons name="eye" size={14} color="#3498db" />
          </View>
        ) : null}
      </Pressable>
      {item.motivo ? (
        <Text style={styles.motivo} numberOfLines={2}>
          {item.motivo}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  posterWrapper: { width: 130 },
  posterCard: { width: 130, aspectRatio: 2 / 3, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1e1e2d' },
  motivo: { color: '#94A3B8', fontSize: 12, lineHeight: 16, marginTop: 6 },
  posterImg: { width: '100%', height: '100%' },
  posterFallback: { justifyContent: 'center', alignItems: 'center' },
  fallbackText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'center', padding: 8 },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  eyeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.85)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.4)',
  },
});
