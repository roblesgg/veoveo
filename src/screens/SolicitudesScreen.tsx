import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  aceptarSolicitud,
  obtenerSolicitudesPendientes,
  rechazarSolicitud,
} from '../services/repositorioSocial';
import { GlassBorder, GlassSurface, COLORS } from '../theme/colors';
import { SHADOWS } from '../theme/theme';
import { GradientBackground } from '../components/GradientBackground';
import type { SolicitudAmistad } from '../types';

export function SolicitudesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [cargando, setCargando] = useState(true);
  const [items, setItems] = useState<SolicitudAmistad[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await obtenerSolicitudesPendientes();
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar solicitudes');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const handleAceptar = async (id: string) => {
    setAccionEnCurso(id);
    try {
      await aceptarSolicitud(id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aceptar solicitud');
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleRechazar = async (id: string) => {
    setAccionEnCurso(id);
    try {
      await rechazarSolicitud(id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al rechazar solicitud');
    } finally {
      setAccionEnCurso(null);
    }
  };

  return (
    <GradientBackground style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <BlurView intensity={80} tint="dark" style={styles.backInner}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </BlurView>
        </Pressable>
        <Text style={styles.titulo}>Solicitudes</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#ff8a80" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {cargando && items.length === 0 ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="rgba(255,255,255,0.2)" />
            <Text style={styles.sub}>No tienes solicitudes pendientes.</Text>
          </View>
        ) : (
          items.map((s) => (
            <BlurView
              key={s.id}
              intensity={40}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={[styles.row, SHADOWS.macLight]}
            >
              <View style={styles.rowContent}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{s.deUsername.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {s.deUsername}
                    </Text>
                    <Text style={styles.uid}>ID: {s.deUid.substring(0, 12)}</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.btn, styles.btnOk, accionEnCurso === s.id && styles.disabled]}
                    onPress={() => handleAceptar(s.id)}
                    disabled={!!accionEnCurso}
                  >
                    <Text style={styles.btnText}>Aceptar</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.btn, styles.btnNo, accionEnCurso === s.id && styles.disabled]}
                    onPress={() => handleRechazar(s.id)}
                    disabled={!!accionEnCurso}
                  >
                    <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                </View>
              </View>
            </BlurView>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 16,
  },
  backBtn: { width: 44, height: 44 },
  backInner: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  titulo: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
  },
  sub: {
    marginTop: 16,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 138, 128, 0.1)',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 128, 0.2)',
  },
  errorText: { color: '#ff8a80', fontSize: 13, fontWeight: '500' },
  row: {
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  rowContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarText: {
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: '800',
  },
  name: { color: '#fff', fontSize: 17, fontWeight: '700' },
  uid: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOk: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 20,
  },
  btnNo: {
    width: 44,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
