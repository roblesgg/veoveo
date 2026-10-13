import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileUrl } from '../../services/tmdbClient';
import type { CastMember } from '../../types';

type Props = {
  reparto: CastMember[];
  fontFamily: string;
  onActorClick: (id: number, name: string) => void;
};

export const MovieCast = React.memo(({ reparto, fontFamily, onActorClick }: Props) => {
  if (reparto.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.section, { fontFamily }]}>Reparto</Text>
      <FlatList
        horizontal
        data={reparto}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16 }}
        renderItem={({ item: a }) => (
          <Pressable style={styles.actor} onPress={() => onActorClick(a.id, a.name)}>
            {profileUrl(a.profile_path) ? (
              <Image source={{ uri: profileUrl(a.profile_path, 'h632')! }} style={styles.actorImg} />
            ) : (
              <View
                style={[
                  styles.actorImg,
                  {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <Ionicons name="person" size={24} color="rgba(255,255,255,0.2)" />
              </View>
            )}
            <Text style={[styles.actorName, { fontFamily }]} numberOfLines={2}>
              {a.name}
            </Text>
            <Text style={styles.actorChar} numberOfLines={1}>
              {a.character}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginTop: 16, marginBottom: 32 },
  section: { fontSize: 22, color: '#fff', fontWeight: '700', marginBottom: 12 },
  actor: { width: 90, alignItems: 'center' },
  actorImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actorName: { color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: '500' },
  actorChar: { color: '#aaa', fontSize: 11, textAlign: 'center' },
});
