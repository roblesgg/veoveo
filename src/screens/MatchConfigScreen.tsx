import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useAuth } from '../context/AuthContext';
import { iniciarMatch } from '../services/repositorioMatches';
import { enviarMensaje, obtenerChat } from '../services/repositorioChats';
import { COLORS, CardSurface } from '../theme/colors';

export function MatchConfigScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { chatId, participants } = route.params;

  const [target, setTarget] = useState(3);
  const [excludeSeen, setExcludeSeen] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const matchId = await iniciarMatch(chatId, user.uid, participants, {
        targetMatches: target,
        excludeSeen,
      });

      // Enviamos un mensaje especial al chat informando del match
      const chat = await obtenerChat(chatId);
      if (chat) {
        await enviarMensaje(
          chat,
          { type: 'match_invite', text: `He propuesto un Movie Match de ${target} películas`, matchId },
          user.displayName || 'Usuario',
        );
      }

      navigation.replace('MovieMatch', { matchId });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BlurView
        intensity={80}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 15 }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Nuevo Match</Text>
      </BlurView>

      <View style={styles.content}>
        <Text style={styles.label}>PELÍCULAS OBJETIVO</Text>
        <Text style={styles.subtitle}>¿Cuántas coincidencias queréis encontrar para terminar?</Text>

        <View style={styles.targetGrid}>
          {[1, 3, 5, 10].map((val) => (
            <Pressable
              key={val}
              onPress={() => setTarget(val)}
              style={[styles.targetBtn, target === val && styles.targetBtnOn]}
            >
              <Text style={[styles.targetText, target === val && { color: '#000' }]}>{val}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Excluir vistas</Text>
            <Text style={styles.settingSub}>
              No mostrar películas que alguno ya haya marcado como vista.
            </Text>
          </View>
          <Pressable
            onPress={() => setExcludeSeen(!excludeSeen)}
            style={[styles.switch, excludeSeen && styles.switchOn]}
          >
            <View style={[styles.switchDot, excludeSeen && { alignSelf: 'flex-end' }]} />
          </Pressable>
        </View>

        <Pressable
          onPress={handleStart}
          style={[styles.startBtn, loading && { opacity: 0.5 }]}
          disabled={loading}
        >
          <Text style={styles.startBtnText}>{loading ? 'Iniciando...' : '¡EMPEZAR AHORA!'}</Text>
          {!loading && <Ionicons name="flame" size={20} color="#000" />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  backBtn: { padding: 8 },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginRight: 40,
  },
  content: { padding: 24, paddingTop: 40 },
  label: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 20 },
  targetGrid: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  targetBtn: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  targetBtnOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  targetText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CardSurface,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  settingSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
  },
  switchOn: { backgroundColor: '#2ecc71' },
  switchDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  startBtn: {
    marginTop: 60,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  startBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
});
