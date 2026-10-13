import { avatarUrl } from '../utils/imagenes';
/**
 * ARCHIVO: screens/PerfilScreen.tsx
 * DESCRIPCIÓN: Pantalla de perfil de usuario.
 * Permite visualizar estadísticas (vistas, por ver, reseñas), editar el nombre
 * de usuario y la foto de perfil, y gestionar la sesión.
 * Incluye accesos a ajustes, usuarios bloqueados y descarga de la app.
 */

import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFirestoreDb } from '../services/firebase';
import { obtenerConfiguracionApp } from '../services/repositorioConfiguracion';
import { useAuth } from '../context/AuthContext';
import { useMontserrat } from '../theme/useMontserrat';
import { useLanguage } from '../context/LanguageContext';
import { GradientBackground } from '../components/GradientBackground';
import { SHADOWS } from '../theme/theme';
import { COLORS } from '../theme/colors';
import { ConfirmModal } from '../components/common/ConfirmModal';

// Hooks
import { useUserProfile } from '../hooks/profile/useUserProfile';

// Modular Components
import { ProfileStats } from '../components/profile/ProfileStats';
import { ProfileOptions } from '../components/profile/ProfileOptions';
import { UsernameModal, AvatarModal } from '../components/profile/ProfileModals';

export function PerfilScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { fontFamily: ff } = useMontserrat();
  const { t } = useLanguage();
  const fontFamily = ff || 'System';

  // HOOK CENTRALIZADO: Gestiona la carga y actualización del perfil en Firestore
  const {
    usuario,
    cargando,
    stats,
    error,
    mensaje,
    handleUpdateUsername,
    handleUpdateAvatar,
    recargar,
  } = useUserProfile();

  // ESTADOS DE MODALES
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');

  // En web: leer la versión publicada desde Firestore para mostrarla en el botón de descarga
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!getFirestoreDb()) return;
    void obtenerConfiguracionApp().then((config) => {
      if (config) setLatestVersion(String(config.min_version ?? ''));
    });
  }, []);

  // ESTADO DE CARGA INICIAL
  if (cargando && !usuario) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </GradientBackground>
    );
  }

  // MANEJO DE ERROR DE CARGA
  if (!usuario) {
    return (
      <GradientBackground style={styles.center}>
        <Text style={styles.errText}>{error || 'Error al cargar perfil'}</Text>
        <Pressable style={styles.retryBtn} onPress={recargar}>
          <Text style={{ color: '#fff', fontFamily }}>Reintentar</Text>
        </Pressable>
      </GradientBackground>
    );
  }

  const fotoUri = usuario.fotoPerfil ?? user?.photoURL ?? null;

  return (
    <GradientBackground style={styles.flex}>
      {/* BOTÓN ATRÁS VOLADOR */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { top: Math.max(insets.top, 12) }]}
      >
        <View style={styles.backBtnInner}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </View>
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60, paddingBottom: 40 }]}
      >
        {/* SECCIÓN DE AVATAR Y EDICIÓN RÁPIDA */}
        <View style={styles.avatarSection}>
          <Pressable
            style={[styles.avatarWrap, SHADOWS.mac]}
            onPress={() => setShowAvatarModal(true)}
          >
            {fotoUri ? (
              <ExpoImage
                source={{ uri: avatarUrl(fotoUri, 120)! }}
                style={styles.avatarImg}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={48} color="rgba(255,255,255,0.85)" />
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>

          <Pressable style={styles.nameRow} onPress={() => setShowUserModal(true)}>
            <Text style={[styles.nameText, { fontFamily }]}>{usuario.username}</Text>
            <View style={styles.editIconCircle}>
              <Ionicons name="pencil" size={12} color="#fff" />
            </View>
          </Pressable>
        </View>

        {/* COMPONENTE: Estadísticas numéricas de la biblioteca */}
        <ProfileStats
          vistas={stats.vistas}
          porVer={stats.porVer}
          resenas={stats.resenas}
          fontFamily={fontFamily}
        />

        {/* COMPONENTE: Menú de opciones (Ajustes, Bloqueados, Cerrar sesión) */}
        <ProfileOptions
          onAjustes={() => navigation.navigate('Ajustes')}
          onBloqueados={() => navigation.navigate('Bloqueados')}
          onLogout={() => setShowLogoutModal(true)}
          fontFamily={fontFamily}
        />

        {/* ACCIONES SECUNDARIAS: Compartir y Descargar APK */}
        <Pressable
          style={styles.shareBtn}
          onPress={() => Share.share({ message: `${t('share_msg')} https://dripdev.dev` })}
        >
          <Ionicons name="share-social-outline" size={22} color="#fff" />
          <Text style={[styles.shareText, { fontFamily }]}>Compartir aplicación</Text>
        </Pressable>

        {Platform.OS === 'web' && (
          <Pressable
            style={styles.downloadBtn}
            onPress={() => Linking.openURL('https://veoveo.dripdev.dev/descargar')}
          >
            <Ionicons name="cloud-download-outline" size={22} color="#fff" />
            <Text style={[styles.downloadText, { fontFamily }]}>
              {latestVersion ? `Descargar App v${latestVersion}` : 'Descargar App'}
            </Text>
          </Pressable>
        )}

        {/* FEEDBACK DE ACCIONES (OK/ERR) */}
        {error && <Text style={styles.feedbackErr}>{error}</Text>}
        {mensaje && <Text style={styles.feedbackOk}>{mensaje}</Text>}
      </ScrollView>

      {/* --- MODALES DE EDICIÓN --- */}

      {/* Editar Nombre de Usuario */}
      <UsernameModal
        visible={showUserModal}
        initialValue={usuario.username}
        onClose={() => setShowUserModal(false)}
        onSave={handleUpdateUsername}
        fontFamily={fontFamily}
      />

      {/* Editar Foto de Perfil (Subida a Firebase Storage) */}
      <AvatarModal
        visible={showAvatarModal}
        initialValue={fotoUri || ''}
        googlePhotoUrl={user?.photoURL}
        onClose={() => setShowAvatarModal(false)}
        onSave={handleUpdateAvatar}
        fontFamily={fontFamily}
      />

      {/* Confirmar Salida */}
      <ConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
        title="Cerrar Sesión"
        message="¿Seguro que quieres salir de VeoVeo?"
        confirmText="Salir"
        cancelText="Cancelar"
        iconName="log-out"
        fontFamily={fontFamily}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 24, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 20, zIndex: 10 },
  backBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  avatarImg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0f172a',
    overflow: 'hidden',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  nameText: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  editIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackErr: { color: '#ff8a80', marginTop: 16 },
  feedbackOk: { color: '#4CAF50', marginTop: 16 },
  errText: { color: '#ff8a80', textAlign: 'center', fontSize: 16 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtn: {
    marginTop: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    minHeight: 56,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  shareText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  downloadBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(105,223,217, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    minHeight: 56,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(105,223,217, 0.4)',
  },
  downloadText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
