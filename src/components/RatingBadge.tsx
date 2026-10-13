/**
 * ARCHIVO: components/RatingBadge.tsx
 * DESCRIPCIÓN: Pequeño indicador visual de valoración (estrellas).
 * Soporta escalas de 5 (personal) y 10 (TMDB), normalizando ambas.
 * Incluye efectos de brillo para notas altas y soporte para valoraciones '💩'.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  rating: number; // Valor numérico. Puede ser 0-5 o 0-10.
  maxRating?: number; // Define el tope de la escala de entrada.
  fontFamily?: string;
  hideText?: boolean; // Si es true, solo muestra las estrellas en formato compacto.
};

export function RatingBadge({
  rating: rawRating,
  maxRating = 5,
  fontFamily,
  hideText = true,
}: Props) {
  // NORMALIZACIÓN: Siempre trabajamos internamente sobre una base de 5 estrellas.
  const rating = maxRating === 10 ? rawRating / 2 : rawRating;

  // Render vacío si no hay puntuación
  if (rating === 0) return null;

  // LÓGICA DE ICONOGRAFÍA
  const isPoop = rawRating === -1; // Valor especial para películas 'nefastas'
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  // LÓGICA DE COLOR (Gradación según nota)
  let iconColor = '#FFD700';
  const glow = rating >= 4.5; // Efecto premium para 'Obras Maestras'

  if (rating >= 4.5)
    iconColor = '#FFD700'; // Oro
  else if (rating >= 3.5)
    iconColor = '#FFC107'; // Ámbar
  else iconColor = '#FF9800'; // Naranja

  return (
    <View style={[styles.badge, glow && styles.glow, hideText && styles.miniBadge]}>
      <View style={[styles.inner, hideText && styles.miniInner]}>
        {isPoop ? (
          <Text style={{ fontSize: 16 }}>💩</Text>
        ) : (
          <View style={styles.starsRow}>
            {/* ESTRELLAS LLENAS */}
            {[...Array(fullStars)].map((_, i) => (
              <Ionicons key={`f-${i}`} name="star" size={hideText ? 10 : 12} color={iconColor} />
            ))}

            {/* MEDIA ESTRELLA */}
            {hasHalfStar && (
              <Ionicons name="star-half" size={hideText ? 10 : 12} color={iconColor} />
            )}

            {/* ESTRELLAS VACÍAS (Solo en modo extendido) */}
            {!hideText &&
              [...Array(emptyStars)].map((_, i) => (
                <Ionicons
                  key={`e-${i}`}
                  name="star-outline"
                  size={12}
                  color="rgba(255,255,255,0.3)"
                />
              ))}

            {/* NOTA NUMÉRICA (Solo en modo extendido) */}
            {!hideText && (
              <Text style={[styles.text, { fontFamily, color: '#fff' }]}>{rating.toFixed(1)}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 4,
  },
  miniBadge: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  glow: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,25,0.7)',
  },
  miniInner: {
    backgroundColor: 'transparent',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 6,
  },
});
