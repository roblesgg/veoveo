import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { GradientBackground } from '../components/GradientBackground';
import { BlurView } from 'expo-blur';
import { SHADOWS } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { useMontserrat } from '../theme/useMontserrat';
import * as preferences from '../storage/preferences';
import { logoUrl } from '../services/tmdbClient';
import { URL_NORMAS, URL_PRIVACIDAD } from '../components/common/AvisoLegal';
import { usePlataformasRegion } from '../hooks/usePlataformasRegion';
import { COLORS } from '../theme/colors';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';

export function AjustesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fontFamily: ff } = useMontserrat();
  const fontFamily = ff || 'System';

  const [misPlataformas, setMisPlataformas] = useState<number[]>([]);
  const [busquedaPlataforma, setBusquedaPlataforma] = useState('');
  const { data: allPlataformas = [], isLoading: cargandoPlats } = usePlataformasRegion();

  useEffect(() => {
    void preferences.cargarPlataformas().then((res) => setMisPlataformas(res.map(Number)));
  }, []);

  const handleTogglePlataforma = async (ids: number[]) => {
    let next: number[];
    const isPresent = ids.some((id) => misPlataformas.includes(id));
    if (isPresent) {
      next = misPlataformas.filter((id) => !ids.includes(id));
    } else {
      next = [...misPlataformas, ...ids];
    }
    setMisPlataformas(next);
    await preferences.guardarPlataformas(next.map(String));
    if (user) {
      void require('../services/userPreferences').guardarPreferenciaFirestore(
        user.uid,
        'plataformas',
        next,
      );
    }
  };

  const filteredPlats = useMemo(() => {
    const q = busquedaPlataforma.trim().toLowerCase();
    if (!q) return allPlataformas;
    return allPlataformas.filter(
      (p) => p.searchTerms.includes(q) || p.name.toLowerCase().includes(q),
    );
  }, [allPlataformas, busquedaPlataforma]);

  return (
    <GradientBackground style={styles.flex}>
      <BlurView
        intensity={80}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
          <Text style={[styles.titulo, { fontFamily }]}>Ajustes</Text>
        </View>
      </BlurView>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 90, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily }]}>Privacidad y Contenido</Text>
          <Pressable
            style={[styles.card, SHADOWS.macLight, { marginBottom: 12 }]}
            onPress={() => navigation.navigate('Privacidad')}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { fontFamily }]}>Privacidad</Text>
              <Text style={[styles.cardDesc, { fontFamily }]}>
                Quién ve tu biblioteca, tus Vistas en Social y Match, solicitudes y bloqueados.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
          {[
            {
              ruta: 'Cuenta' as const,
              titulo: 'Cuenta',
              texto: 'Correo, contraseña, descargar tus datos y borrar la cuenta.',
            },
            {
              ruta: 'Notificaciones' as const,
              titulo: 'Notificaciones',
              texto: 'Qué avisos quieres recibir.',
            },
          ].map((f) => (
            <Pressable
              key={f.ruta}
              style={[styles.card, SHADOWS.macLight, { marginBottom: 12 }]}
              onPress={() => navigation.navigate(f.ruta)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { fontFamily }]}>{f.titulo}</Text>
                <Text style={[styles.cardDesc, { fontFamily }]}>{f.texto}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily }]}>Mis Plataformas de Streaming</Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoText, { fontFamily }]}>
                Selecciona las plataformas que pagas para que marquemos con colores dónde ver cada
                película:
              </Text>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: '#2ecc71' }]} />
                <Text style={styles.legendText}>Disponible en tus plataformas</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: '#f39c12' }]} />
                <Text style={styles.legendText}>Disponible (streaming o alquiler)</Text>
              </View>
            </View>
          </View>

          <TextInput
            value={busquedaPlataforma}
            onChangeText={setBusquedaPlataforma}
            placeholder="Buscar (ej: Amazon, Movistar, HBO...)"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={[styles.platSearch, { fontFamily }]}
          />
          <View style={styles.platsContainer}>
            {cargandoPlats ? (
              <LoaderClaqueta tamano="mediano" />
            ) : (
              filteredPlats.map((p) => (
                <Pressable
                  key={p.name}
                  onPress={() => handleTogglePlataforma(p.ids)}
                  style={[
                    styles.platItem,
                    p.ids.some((id: number) => misPlataformas.includes(id)) &&
                      styles.platItemActive,
                  ]}
                >
                  <Image source={{ uri: logoUrl(p.logo) ?? undefined }} style={styles.platLogo} />
                  <Text style={[styles.platName, { fontFamily }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.ids.some((id: number) => misPlataformas.includes(id)) && (
                    <Ionicons name="checkmark-circle" size={16} color="#000" style={styles.check} />
                  )}
                </Pressable>
              ))
            )}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily }]}>Información Legal</Text>
          <View
            style={[
              styles.card,
              SHADOWS.macLight,
              { flexDirection: 'column', alignItems: 'center', paddingVertical: 24 },
            ]}
          >
            <Text style={[styles.legalText, { fontFamily, textAlign: 'center' }]}>
              Esta aplicación usa TMDB y sus API, pero TMDB no la respalda, certifica ni aprueba.
            </Text>
            <Text style={[styles.legalText, { fontFamily, textAlign: 'center', marginTop: 8 }]}>
              Datos de plataformas: JustWatch.
            </Text>
          </View>
          <Pressable
            style={[styles.card, SHADOWS.macLight, { marginTop: 12 }]}
            onPress={() => void Linking.openURL(URL_NORMAS)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { fontFamily }]}>Normas de la comunidad</Text>
              <Text style={[styles.cardDesc, { fontFamily }]}>
                Qué no está permitido y cómo denunciar
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Pressable
            style={[styles.card, SHADOWS.macLight, { marginTop: 12 }]}
            onPress={() => void Linking.openURL(URL_PRIVACIDAD)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { fontFamily }]}>Política de privacidad</Text>
              <Text style={[styles.cardDesc, { fontFamily }]}>Qué datos guardamos y para qué</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Pressable
            style={[styles.card, SHADOWS.macLight, { marginTop: 12 }]}
            onPress={() =>
              void Linking.openURL(
                `mailto:dripdev.dev@gmail.com?subject=${encodeURIComponent(`VeoVeo ${Constants.expoConfig?.version ?? ''}`)}`,
              )
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { fontFamily }]}>Contacto y soporte</Text>
              <Text style={[styles.cardDesc, { fontFamily }]}>
                Escríbenos a dripdev.dev@gmail.com
              </Text>
            </View>
            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Text style={[styles.versionText, { fontFamily }]}>
            VeoVeo {Constants.expoConfig?.version} · Un producto de DripDev · hecho por Álvaro
            Robles
          </Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

// 🍿 IDs Oficiales de TMDB para España (Logic unchanged)
const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(15, 23, 42, 0.2)', // Más transparente para Glassmorphism
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '900', marginLeft: 8 },
  scroll: { paddingHorizontal: 20 },
  section: { marginBottom: 32 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  infoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  platsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  platItem: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  platItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  platLogo: { width: 36, height: 36, borderRadius: 10, marginBottom: 8 },
  platName: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  check: { position: 'absolute', top: 4, right: 4 },
  platSearch: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  legalText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 18, marginTop: 12 },
  versionText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
