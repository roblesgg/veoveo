import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type OptionProps = {
  texto: string;
  icon: any;
  onPress: () => void;
  destructive?: boolean;
  fontFamily: string;
};

const OpcionRow = ({ texto, icon, onPress, destructive, fontFamily }: OptionProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.opcionRow,
      pressed && { backgroundColor: 'rgba(255,255,255,0.05)' },
    ]}
    onPress={onPress}
  >
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={20} color={destructive ? '#ff4444' : 'rgba(255,255,255,0.7)'} />
    </View>
    <Text style={[styles.opcionText, destructive && { color: '#ff4444' }, { fontFamily }]}>
      {texto}
    </Text>
    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.15)" />
  </Pressable>
);

type Props = {
  onAjustes: () => void;
  onBloqueados: () => void;
  onLogout: () => void;
  fontFamily: string;
};

export const ProfileOptions = React.memo(
  ({ onAjustes, onBloqueados, onLogout, fontFamily }: Props) => {
    return (
      <View style={styles.optionsCardContainer}>
        <View style={styles.content}>
          <OpcionRow
            texto="Ajustes de la aplicación"
            icon="settings-outline"
            onPress={onAjustes}
            fontFamily={fontFamily}
          />
          <View style={styles.divider} />
          <OpcionRow
            texto="Usuarios bloqueados"
            icon="close-circle-outline"
            onPress={onBloqueados}
            fontFamily={fontFamily}
          />
          <View style={styles.divider} />
          <OpcionRow
            texto="Cerrar sesión"
            icon="log-out-outline"
            onPress={onLogout}
            destructive
            fontFamily={fontFamily}
          />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  optionsCardContainer: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 8,
  },
  content: { width: '100%' },
  opcionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: '100%',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  opcionText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 72 },
});
