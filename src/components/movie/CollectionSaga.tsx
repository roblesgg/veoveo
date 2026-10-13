import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { posterUrl } from '../../services/tmdbClient';
import type { CollectionDetails } from '../../types';

type Props = {
  coleccion: CollectionDetails | null;
  fontFamily: string;
  onMovieClick: (id: number) => void;
};

export const CollectionSaga = React.memo(({ coleccion, fontFamily, onMovieClick }: Props) => {
  if (!coleccion || coleccion.parts.length <= 1) return null;
  const sortedParts = [...coleccion.parts].sort((a, b) =>
    (a.release_date || '').localeCompare(b.release_date || ''),
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.section, { fontFamily }]}>De la misma saga</Text>
      <FlatList
        horizontal
        data={sortedParts}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        renderItem={({ item: m }) => (
          <Pressable style={styles.sagaItem} onPress={() => onMovieClick(m.id)}>
            {m.poster_path ? (
              <Image source={{ uri: posterUrl(m.poster_path, 'w342')! }} style={styles.sagaImg} />
            ) : (
              <View
                style={[
                  styles.sagaImg,
                  {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <Text style={{ color: '#fff', fontSize: 10, textAlign: 'center' }}>{m.title}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginTop: 16, marginBottom: 24 },
  section: { fontSize: 22, color: '#fff', fontWeight: '700', marginBottom: 12 },
  sagaItem: {
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sagaImg: { width: '100%', height: '100%' },
});
