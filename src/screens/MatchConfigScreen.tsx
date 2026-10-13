/**
 * ARCHIVO: screens/MatchConfigScreen.tsx
 * DESCRIPCIÓN: Preparar un Movie Match. Desde un chat juegan todos sus miembros; sin chat,
 * se eligen amigos a mano. Se decide cuántas coincidencias buscar y se genera el mazo.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCheck, IconSearch, IconX } from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { useSocialData } from '../hooks/social/useSocialData';
import { nombreDe, usePerfiles } from '../hooks/usePerfiles';
import { crearMatch } from '../services/repositorioMatches';
import { observarChat } from '../services/repositorioChats';
import { Avatar } from '../components/common/Avatar';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';
import type { Chat } from '../types';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';

const OBJETIVOS = [1, 2, 3, 4, 5];

export function MatchConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const chatId: string | undefined = route.params?.chatId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { amigos } = useSocialData();

  const [chat, setChat] = useState<Chat | null>(null);
  const [objetivo, setObjetivo] = useState(3);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [filtro, setFiltro] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => (chatId ? observarChat(chatId, setChat) : undefined), [chatId]);

  const otrosDelChat = useMemo(
    () => (chat?.participants ?? []).filter((u) => u !== user?.uid),
    [chat, user],
  );
  const perfiles = usePerfiles(otrosDelChat);
  const participantes = chatId ? otrosDelChat : elegidos;

  const lista = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return q ? amigos.filter((a) => a.username.toLowerCase().includes(q)) : amigos;
  }, [amigos, filtro]);

  const alternar = (uid: string) =>
    setElegidos((prev) =>
      prev.includes(uid)
        ? prev.filter((u) => u !== uid)
        : prev.length >= 11
          ? prev
          : [...prev, uid],
    );

  const empezar = async () => {
    if (!user || participantes.length === 0 || creando) return;
    setCreando(true);
    setError(null);
    try {
      const matchId = await crearMatch({
        chat,
        participantes,
        objetivo,
        nombreCreador: user.displayName || 'Alguien',
      });
      navigation.replace('MovieMatch', { matchId });
    } catch {
      setError('No hemos podido preparar el Match. Revisa la conexión.');
      setCreando(false);
    }
  };

  if (creando) {
    return (
      <View style={[styles.flex, styles.centro]}>
        <LoaderClaqueta texto="Barajando las pelis de todos…" />
      </View>
    );
  }

  const cabeceraConfig = (
    <View style={{ gap: 12, paddingHorizontal: 20, paddingBottom: 8 }}>
      <Text style={styles.etiqueta}>¿Cuántas pelis en común buscáis?</Text>
      <View style={styles.objetivos}>
        {OBJETIVOS.map((n) => (
          <Pressable
            key={n}
            onPress={() => setObjetivo(n)}
            style={[styles.objetivo, objetivo === n && styles.objetivoOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: objetivo === n }}
            accessibilityLabel={`${n} ${n === 1 ? 'película' : 'películas'}`}
          >
            <Text style={[styles.objetivoTexto, objetivo === n && styles.objetivoTextoOn]}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.ayuda}>
        El Match termina al encontrar {objetivo} {objetivo === 1 ? 'peli' : 'pelis'} que os gusten a
        todos, o antes si alguien lo cierra. El mazo mezcla el Por ver de cada uno, recomendaciones
        para el grupo y las Vistas de quien lo permite.
      </Text>
      <Text style={[styles.etiqueta, { marginTop: 12 }]}>{chatId ? 'Jugáis' : '¿Con quién?'}</Text>
    </View>
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecera}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Cerrar">
          <IconX size={26} color={COLORS.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.titulo}>Nuevo Movie Match</Text>
      </View>

      {chatId ? (
        <FlatList
          data={otrosDelChat}
          keyExtractor={(u) => u}
          ListHeaderComponent={cabeceraConfig}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.fila}>
              <Avatar
                uri={perfiles[item]?.fotoPerfil}
                nombre={perfiles[item]?.username}
                tamano={40}
              />
              <Text style={styles.nombre}>{nombreDe(perfiles[item], !perfiles[item])}</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(a) => a.uid}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            <>
              {cabeceraConfig}
              {amigos.length > 6 && (
                <View style={styles.buscador}>
                  <IconSearch size={18} color={COLORS.textMuted} strokeWidth={2} />
                  <TextInput
                    value={filtro}
                    onChangeText={setFiltro}
                    placeholder="Buscar entre tus amigos"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.campo}
                  />
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <Text style={styles.vacio}>
              {amigos.length === 0
                ? 'Para jugar necesitas amigos. Añádelos desde Social.'
                : 'Nadie se llama así.'}
            </Text>
          }
          renderItem={({ item }) => {
            const marcado = elegidos.includes(item.uid);
            return (
              <Pressable
                style={styles.fila}
                onPress={() => alternar(item.uid)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: marcado }}
              >
                <Avatar uri={item.fotoPerfil} nombre={item.username} tamano={40} />
                <Text style={styles.nombre}>{item.username}</Text>
                <View style={[styles.casilla, marcado && styles.casillaOn]}>
                  {marcado && <IconCheck size={16} color={COLORS.onAccent} strokeWidth={3} />}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <View style={[styles.pieBoton, { bottom: insets.bottom + 20 }]}>
        <Pressable
          onPress={() => void empezar()}
          disabled={participantes.length === 0}
          style={[styles.boton, participantes.length === 0 && { opacity: 0.4 }]}
        >
          <Text style={styles.botonTexto}>
            {participantes.length === 0 ? 'Elige al menos un amigo' : 'Empezar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  centro: { alignItems: 'center', justifyContent: 'center' },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  etiqueta: { color: COLORS.text, fontSize: 16, fontFamily: FUENTES.titulo },
  ayuda: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: FUENTES.texto },
  objetivos: { flexDirection: 'row', gap: 10 },
  objetivo: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objetivoOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  objetivoTexto: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  objetivoTextoOn: { color: COLORS.onAccent },
  buscador: {
    marginHorizontal: 20,
    marginBottom: 8,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  campo: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: FUENTES.texto },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  nombre: { flex: 1, color: COLORS.text, fontSize: 16, fontFamily: FUENTES.texto },
  casilla: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  vacio: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 36,
  },
  error: {
    color: COLORS.error,
    fontSize: 13,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    marginBottom: 90,
  },
  pieBoton: { position: 'absolute', left: 20, right: 20 },
  boton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { color: COLORS.onAccent, fontSize: 16, fontFamily: FUENTES.titulo },
});
