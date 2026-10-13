import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  iconName: any;
  iconColor?: string;
  confirmColor?: string;
  fontFamily: string;
};

export const ConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  iconName,
  iconColor = '#ff4444',
  confirmColor = '#ff4444',
  fontFamily,
}: Props) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <BlurView
          intensity={60}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.modernCard}>
          <View style={[styles.iconCircle, { backgroundColor: `${iconColor}1A` }]}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>

          <Text style={[styles.title, { fontFamily }]}>{title}</Text>
          <Text style={[styles.message, { fontFamily }]}>{message}</Text>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.btnCancel}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily, fontWeight: '600' }}>
                {cancelText}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onConfirm();
                onClose();
              }}
              style={[styles.btnConfirm, { backgroundColor: confirmColor }]}
            >
              <Text style={{ color: '#fff', fontFamily, fontWeight: '800' }}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modernCard: {
    width: '100%',
    backgroundColor: 'rgba(23, 23, 40, 0.95)',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 30,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  message: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  btnCancel: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnConfirm: {
    flex: 1.5,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
