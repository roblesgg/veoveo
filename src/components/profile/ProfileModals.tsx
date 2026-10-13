import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

type UsernameModalProps = {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (val: string) => Promise<boolean>;
  fontFamily: string;
};

export const UsernameModal = ({
  visible,
  initialValue,
  onClose,
  onSave,
  fontFamily,
}: UsernameModalProps) => {
  const [val, setVal] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const handleSave = async () => {
    setLoading(true);
    const ok = await onSave(val);
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <BlurView
          intensity={60}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.abs}
        />
        <View style={styles.modernModalCard}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
            <Ionicons name="person-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={[styles.modernModalTitle, { fontFamily }]}>Nombre de Usuario</Text>
          <Text style={[styles.modernModalSub, { fontFamily }]}>
            Elige cómo te verán los demás en VeoVeo.
          </Text>

          <TextInput
            value={val}
            onChangeText={setVal}
            style={[styles.modernInput, { fontFamily }]}
            placeholder="Nuevo nombre..."
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <View style={styles.modernActions}>
            <Pressable onPress={onClose} style={styles.btnCancel}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily, fontWeight: '600' }}>
                Cancelar
              </Text>
            </Pressable>
            {loading ? (
              <View style={styles.btnConfirm}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <Pressable onPress={handleSave} style={styles.btnConfirm}>
                <Text style={{ color: '#fff', fontFamily, fontWeight: '800' }}>Guardar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

type AvatarModalProps = {
  visible: boolean;
  initialValue: string;
  googlePhotoUrl?: string | null;
  onClose: () => void;
  onSave: (val: string) => Promise<boolean>;
  fontFamily: string;
};

export const AvatarModal = ({
  visible,
  initialValue,
  googlePhotoUrl,
  onClose,
  onSave,
  fontFamily,
}: AvatarModalProps) => {
  const [val, setVal] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const handleSave = async (customVal?: string) => {
    setLoading(true);
    const finalVal = customVal || val;
    const ok = await onSave(finalVal);
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <BlurView
          intensity={60}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.abs}
        />
        <View style={styles.modernModalCard}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
            <Ionicons name="image-outline" size={32} color="#a855f7" />
          </View>
          <Text style={[styles.modernModalTitle, { fontFamily }]}>Foto de Perfil</Text>
          <Text style={[styles.modernModalSub, { fontFamily }]}>
            Pega un enlace o usa tu cuenta de Google.
          </Text>

          <TextInput
            value={val}
            onChangeText={setVal}
            style={[styles.modernInput, { fontFamily }]}
            placeholder="https://imgur.com/..."
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          {googlePhotoUrl && (
            <Pressable
              style={styles.googleBtn}
              onPress={() => {
                setVal(googlePhotoUrl);
                handleSave(googlePhotoUrl);
              }}
            >
              <Ionicons name="logo-google" size={18} color="#fff" />
              <Text style={[styles.googleBtnText, { fontFamily }]}>Usar mi foto de Google</Text>
            </Pressable>
          )}

          <View style={styles.modernActions}>
            <Pressable onPress={onClose} style={styles.btnCancel}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily, fontWeight: '600' }}>
                Cancelar
              </Text>
            </Pressable>
            {loading ? (
              <View style={styles.btnConfirm}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <Pressable onPress={() => handleSave()} style={styles.btnConfirm}>
                <Text style={{ color: '#fff', fontFamily, fontWeight: '800' }}>Actualizar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  abs: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modernModalCard: {
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
  modernModalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modernModalSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modernInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 18,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  googleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modernActions: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  btnCancel: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnConfirm: {
    flex: 1.5,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
