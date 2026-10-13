import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  vistas: number;
  porVer: number;
  resenas: number;
  fontFamily: string;
};

export const ProfileStats = React.memo(({ vistas, porVer, resenas, fontFamily }: Props) => {
  return (
    <View style={styles.statsCardContainer}>
      <View style={styles.statsRow}>
        <StatItem num={String(vistas)} label="Vistas" ff={fontFamily} />
        <View style={styles.divider} />
        <StatItem num={String(porVer)} label="Por Ver" ff={fontFamily} />
        <View style={styles.divider} />
        <StatItem num={String(resenas)} label="Reseñas" ff={fontFamily} />
      </View>
    </View>
  );
});

const StatItem = ({ num, label, ff }: { num: string; label: string; ff: string }) => (
  <View style={styles.statItem}>
    <Text style={styles.statNum}>{num}</Text>
    <Text style={[styles.statLabel, { fontFamily: ff }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  statsCardContainer: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 20,
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statNum: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
  },
});
