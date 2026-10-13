import React from 'react';
import { Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '../../theme/theme';
import { COLORS } from '../../theme/colors';

type Props = {
  visible: boolean;
  onSelect: (mode: 'vista' | 'por_ver' | 'explorar') => void;
  fontFamily: string;
};

export const ChatPlusMenu = ({ visible, onSelect, fontFamily }: Props) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <BlurView
        intensity={90}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.menu, SHADOWS.mac]}
      >
        <Pressable style={styles.item} onPress={() => onSelect('vista')}>
          <View style={[styles.iconCircle, { backgroundColor: '#2ecc7120' }]}>
            <Ionicons name="eye" size={20} color="#2ecc71" />
          </View>
          <Text style={[styles.text, { fontFamily }]}>Vistas</Text>
        </Pressable>

        <View style={styles.separator} />

        <Pressable style={styles.item} onPress={() => onSelect('por_ver')}>
          <View style={[styles.iconCircle, { backgroundColor: '#3498db20' }]}>
            <Ionicons name="bookmark" size={20} color="#3498db" />
          </View>
          <Text style={[styles.text, { fontFamily }]}>Por Ver</Text>
        </Pressable>

        <View style={styles.separator} />

        <Pressable style={styles.item} onPress={() => onSelect('explorar')}>
          <View style={[styles.iconCircle, { backgroundColor: COLORS.primary + '20' }]}>
            <Ionicons name="search" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.text, { fontFamily }]}>Explorar</Text>
        </Pressable>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    zIndex: 1000,
  },
  menu: {
    width: 160,
    backgroundColor: 'rgba(23, 23, 40, 0.8)',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 12,
  },
});
