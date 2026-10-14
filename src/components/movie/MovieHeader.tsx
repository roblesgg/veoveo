import React from 'react';
import { Image, StyleSheet, Text, View, Dimensions, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { posterUrl } from '../../services/tmdbClient';
import type { MovieDetails, WatchProvidersResponse } from '../../types';
import { SHADOWS } from '../../theme/theme';
import { COLORS, GLASS } from '../../theme/colors';

type Props = {
  detalles: MovieDetails;
  fontFamily: string;
  misPlataformas?: number[];
  providers: WatchProvidersResponse | null;
  /** Para medir el cartel (zoom desde la lista) */
  refCartel?: React.Ref<View>;
  /** Mientras vuela la copia del cartel, el de verdad no se ve */
  ocultarCartel?: boolean;
  /** Avisa cuando el cartel ya está colocado (para medirlo) */
  onCartelColocado?: () => void;
};

export const MovieHeader = React.memo(
  ({
    detalles,
    fontFamily,
    misPlataformas = [],
    providers,
    refCartel,
    ocultarCartel,
    onCartelColocado,
  }: Props) => {
    const resES = providers?.results?.['ES'];
    const flatrate = resES?.flatrate?.map((p) => p.provider_id) || [];
    const rent = [...(resES?.rent || []), ...(resES?.buy || [])].map((p) => p.provider_id);

    const isFlatrate = flatrate.some((p) => misPlataformas.includes(p));
    const isRent = !isFlatrate && rent.some((p) => misPlataformas.includes(p));

    const trailer = detalles.videos?.results?.find(
      (v) => v.type === 'Trailer' && v.site === 'YouTube',
    );

    const playTrailer = () => {
      if (trailer) {
        WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${trailer.key}`);
      }
    };

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '—';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.macCardWrap, SHADOWS.mac]}>
            <BlurView
              intensity={80}
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: 24, overflow: 'hidden', zIndex: -1 },
              ]}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'rgba(15, 23, 42, 0.08)',
                  borderBottomWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 24,
                  zIndex: -1,
                },
              ]}
            />

            <View style={[styles.macCardInner, { zIndex: 1 }]}>
              <View
                ref={refCartel}
                collapsable={false}
                onLayout={onCartelColocado}
                style={[styles.posterShadow, ocultarCartel && { opacity: 0 }]}
              >
                <View style={styles.posterClip}>
                  {detalles.poster_path ? (
                    <Image
                      source={{ uri: posterUrl(detalles.poster_path, 'w500')! }}
                      style={styles.mainPoster}
                    />
                  ) : (
                    <View
                      style={[styles.mainPoster, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                    />
                  )}
                  {(isFlatrate || isRent) && (
                    <View
                      style={[styles.dot, { backgroundColor: isFlatrate ? '#2ecc71' : '#f39c12' }]}
                    />
                  )}
                </View>
              </View>

              <View style={styles.infoCol}>
                <Text style={[styles.title, { fontFamily }]} numberOfLines={3}>
                  {detalles.title}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { fontFamily }]}>
                    {formatDate(detalles.release_date)}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={[styles.badgeText, { fontFamily }]}>
                      ⭐ {detalles.vote_average.toFixed(1)}
                    </Text>
                  </View>
                  {detalles.runtime ? (
                    <View style={styles.badge}>
                      <Text style={[styles.badgeText, { fontFamily }]}>{detalles.runtime} min</Text>
                    </View>
                  ) : null}
                </View>

                {trailer && (
                  <Pressable
                    onPress={playTrailer}
                    style={({ pressed }) => [styles.trailerBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons
                      name="play-circle"
                      size={18}
                      color={COLORS.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.trailerText, { fontFamily }]}>Ver Trailer</Text>
                  </Pressable>
                )}

                {detalles.genres.length ? (
                  <View style={styles.genreRow}>
                    {detalles.genres.slice(0, 3).map((g) => (
                      <View key={g.id} style={styles.chip}>
                        <Text style={styles.chipText}>{g.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { width: '100%', minHeight: 200 },
  content: { paddingHorizontal: 20, paddingTop: 100, zIndex: 10 },
  macCardWrap: {
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  macCardInner: { flexDirection: 'row', gap: 16, padding: 16, alignItems: 'center' },
  posterShadow: {
    width: 100,
    height: 150,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...SHADOWS.macLight,
  },
  posterClip: { width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' },
  mainPoster: { width: '100%', height: '100%' },
  infoCol: { flex: 1 },
  title: { fontSize: 28, color: '#fff', fontWeight: '800', lineHeight: 32, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  metaText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  badge: {
    backgroundColor: GLASS.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  trailerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  trailerText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: GLASS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: GLASS.white,
  },
  chipText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 4,
  },
});
