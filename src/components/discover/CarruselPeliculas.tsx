/**
 * ARCHIVO: components/discover/CarruselPeliculas.tsx
 * DESCRIPCIÓN: Carrusel horizontal de películas para la pantalla 'Descubrir'.
 * Cada carrusel representa una categoría (Tendencias, Popular, etc).
 * Soporta modo edición (reordenar por drag y eliminar), carga más pelis al llegar al final
 * y estados de biblioteca (visto/por ver) integrados en los carteles.
 */

import React, { memo } from 'react';
import {
  ActivityIndicator,
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
import { useCarrusel, useRecomendaciones } from '../../hooks/useDescubrir';
import { obtenerCarrusel } from '../../constants/carruseles';

type Props = {
  /** Id del carrusel en el catálogo (constants/carruseles.ts) */
  id: string;
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
    id,
    modoEdicion,
    fontFamily,
    onEliminar,
    onPeliculaClick,
    drag,
    isActive,
    misPlataformas = [],
    libraryMap = {},
  }: Props) => {
    const def = obtenerCarrusel(id);
    const esParaTi = id === 'para-ti';
    const catalogo = useCarrusel(id, Boolean(def?.ruta));
    const recomendaciones = useRecomendaciones(esParaTi);
    const peliculas: (Movie & { motivo?: string })[] = esParaTi
      ? recomendaciones.data ?? []
      : catalogo.peliculas;
    const cargando = esParaTi ? recomendaciones.isLoading : catalogo.isLoading;
    const error = esParaTi ? recomendaciones.isError : catalogo.isError;
    if (peliculas.length > 0) marcarHito('primera fila con datos');

    if (!def) return null;

    const cargarMas = () => {
      if (!esParaTi && catalogo.hasNextPage && !catalogo.isFetchingNextPage) {
        void catalogo.fetchNextPage();
      }
    };
    const reintentar = () => void (esParaTi ? recomendaciones.refetch() : catalogo.refetch());

    return (
      <View style={{ marginBottom: 28, opacity: isActive ? 0.5 : 1 }}>
        <View style={styles.carruselHeader}>
          {/* TÍTULO CON GESTO DE DRAG */}
          <Pressable onLongPress={drag} delayLongPress={200} style={styles.carruselTitleContainer}>
            <Text style={[styles.carruselTitulo, { fontFamily }]}>{def.titulo}</Text>
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

        {/* ESTADOS: vacío de "Para ti" y error con reintento */}
        {!cargando && peliculas.length === 0 ? (
          <Pressable onPress={error ? reintentar : undefined} style={styles.avisoCard}>
            <Ionicons
              name={error ? 'cloud-offline-outline' : 'sparkles-outline'}
              size={22}
              color={COLORS.primary}
            />
            <Text style={[styles.avisoTexto, { fontFamily }]}>
              {error
                ? 'No hemos podido cargar las pelis. Toca para reintentar.'
                : esParaTi
                  ? 'Valora con 4 o 5 estrellas las pelis que hayas visto y aquí te recomendaremos otras.'
                  : 'No hay pelis en esta lista ahora mismo.'}
            </Text>
          </Pressable>
        ) : (
        /* LISTADO HORIZONTAL: carga más pelis al llegar al final */
        <FlatList
          horizontal
          data={peliculas}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 25, gap: 14 }}
          nestedScrollEnabled
          removeClippedSubviews
          initialNumToRender={5}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            catalogo.isFetchingNextPage ? (
              <View style={styles.footerCargando}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <PosterItem
              item={item}
              onPeliculaClick={onPeliculaClick}
              misPlataformas={misPlataformas}
              libraryMap={libraryMap}
            />
          )}
        />
        )}
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
  footerCargando: { width: 60, height: 195, justifyContent: 'center', alignItems: 'center' },
  avisoCard: {
    marginHorizontal: 25,
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: GLASS.white,
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  avisoTexto: { flex: 1, color: COLORS.textMuted, fontSize: 14, lineHeight: 20 },
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
