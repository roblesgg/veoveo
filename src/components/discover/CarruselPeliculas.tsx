/**
 * ARCHIVO: components/discover/CarruselPeliculas.tsx
 * DESCRIPCIÓN: Carrusel horizontal de películas para la pantalla 'Descubrir'.
 * Cada carrusel representa una categoría (Tendencias, Popular, etc).
 * Soporta modo edición (reordenar por drag y eliminar), recarga manual 
 * y estados de biblioteca (visto/por ver) integrados en los carteles.
 */

import React, { memo, useRef } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInRight,
} from 'react-native-reanimated';
import { PosterItem } from './PosterItem';
import type { Movie } from '../../types';
import { COLORS, GLASS } from '../../theme/colors';
import { marcarHito } from '../../utils/medicionArranque';
import { useCarrusel, useRecargaCarruseles } from '../../hooks/useDescubrir';

type Props = {
  titulo: string;
  modoEdicion: boolean;
  fontFamily: string;
  onEliminar: () => void;
  onPeliculaClick: (id: number) => void;
  /** Inicia el gesto de arrastre (DraggableFlatList) */
  drag: () => void;
  /** Estado de arrastre activo */
  isActive: boolean;
  misPlataformas?: number[];
  /** Mapa de cache de la biblioteca del usuario para pintar badges */
  libraryMap?: { [id: number]: { estado: 'por_ver' | 'vista', valoracion: number } };
};

export const CarruselPeliculas = memo(
  ({
    titulo,
    modoEdicion,
    fontFamily,
    onEliminar,
    onPeliculaClick,
    drag,
    isActive,
    misPlataformas = [],
    libraryMap = {},
  }: Props) => {
    const { data: peliculas = [], isFetching } = useCarrusel(titulo);
    const { recargarCarrusel } = useRecargaCarruseles();
    const listRef = useRef<FlatList<Movie>>(null);
    if (peliculas.length > 0) marcarHito('primera fila con datos');

    /** Recarga manual con el botón del final del carrusel */
    const handleManualRefresh = () => {
      if (isFetching) return;
      recargarCarrusel(titulo);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    };
    const refreshing = isFetching;

    return (
      <View style={{ marginBottom: 28, opacity: isActive ? 0.5 : 1 }}>
        <View style={styles.carruselHeader}>
          {/* TÍTULO CON GESTO DE DRAG */}
          <Pressable onLongPress={drag} delayLongPress={200} style={styles.carruselTitleContainer}>
            <Text style={[styles.carruselTitulo, { fontFamily }]}>{titulo}</Text>
            {modoEdicion && (
              <Animated.View entering={FadeInRight}>
                <Ionicons
                  name="reorder-two-outline"
                  size={20}
                  color="rgba(255,255,255,0.4)"
                  style={{ marginLeft: 8 }}
                />
              </Animated.View>
            )}
          </Pressable>

          {/* BOTÓN ELIMINAR (Solo en edición) */}
          {modoEdicion && (
            <Pressable onPress={onEliminar} hitSlop={12} style={styles.eliminarBtn}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </Pressable>
          )}
        </View>

        {/* LISTADO HORIZONTAL */}
        <FlatList
          ref={listRef}
          horizontal
          data={peliculas}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 25, gap: 14 }}
          nestedScrollEnabled
          removeClippedSubviews // Optimización para listas largas
          initialNumToRender={5}
          overScrollMode="always"
          
          // ELEMENTO FINAL: Botón 'Recargar' (Nuevas películas)
          ListFooterComponent={() => (
            <Pressable
              onPress={handleManualRefresh}
              style={({ pressed }) => [
                styles.footerCard,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <View style={[styles.footerCircle, { backgroundColor: `${COLORS.primary}20`, borderColor: `${COLORS.primary}40` }]}>
                <Ionicons name={refreshing ? 'sync' : 'refresh'} size={28} color={COLORS.primary} />
              </View>
              <Text style={[styles.footerText, { fontFamily }]}>
                {refreshing ? 'Cargando...' : 'Recargar'}
              </Text>
            </Pressable>
          )}
          
          renderItem={({ item }) => (
            <PosterItem
              item={item}
              onPeliculaClick={onPeliculaClick}
              misPlataformas={misPlataformas}
              libraryMap={libraryMap}
            />
          )}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  carruselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 12,
  },
  carruselTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  carruselTitulo: { color: '#fff', fontSize: 20, fontWeight: '700' },
  eliminarBtn: { padding: 4 },
  footerCard: {
    width: 100,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GLASS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: GLASS.border,
    marginRight: 25,
    marginLeft: 5,
  },
  footerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
