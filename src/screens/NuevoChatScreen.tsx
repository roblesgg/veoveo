/**
 * ARCHIVO: screens/NuevoChatScreen.tsx
 * DESCRIPCIÓN: Empezar un chat. Con un amigo, chat individual (reutiliza el que ya exista);
 * con varios, grupo con nombre y emoji. Solo amigos (lo exigen las reglas).
 */
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCheck, IconChevronLeft, IconSearch } from '@tabler/icons-react-native';
import { useSocialData } from '../hooks/social/useSocialData';
import { abrirChatIndividual, crearGrupo } from '../services/repositorioChats';
import { Avatar } from '../components/common/Avatar';
import { EMOJIS_GRUPO, SelectorEmoji } from '../components/chat/SelectorEmoji';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';

export function NuevoChatScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { amigos } = useSocialData();
  const [filtro, setFiltro] = useState('');
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS_GRUPO[0]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lista = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return q ? amigos.filter((a) => a.username.toLowerCase().includes(q)) : amigos;
  }, [amigos, filtro]);

  const esGrupo = elegidos.length > 1;
  const alternar = (uid: string) =>
    setElegidos((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));

  const empezar = async () => {
    if (elegidos.length === 0 || creando) return;
    setCreando(true);
    setError(null);
    try {
      const chatId = esGrupo ? await crearGrupo(elegidos, nombre, emoji) : await abrirChatIndividual(elegidos[0]);
      navigation.replace('Conversacion', { chatId });
    } catch {
      setError('No hemos podido crear el chat. Revisa la conexión.');
      setCreando(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecera}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Volver">
          <IconChevronLeft size={28} color={COLORS.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.titulo}>{esGrupo ? 'Nuevo grupo' : 'Nuevo chat'}</Text>
      </View>

      {esGrupo && (
        <View style={styles.grupo}>
          <SelectorEmoji valor={emoji} onCambio={setEmoji} />
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre del grupo"
            placeholderTextColor={COLORS.textMuted}
            style={styles.campoNombre}
            maxLength={40}
          />
        </View>
      )}

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

      <FlatList
        data={lista}
        keyExtractor={(a) => a.uid}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {amigos.length === 0 ? 'Aún no tienes amigos. Añádelos desde Social.' : 'Nadie se llama así.'}
          </Text>
        }
        renderItem={({ item }) => {
          const marcado = elegidos.includes(item.uid);
          return (
            <Pressable style={styles.fila} onPress={() => alternar(item.uid)} accessibilityRole="checkbox" accessibilityState={{ checked: marcado }}>
              <Avatar uri={item.fotoPerfil} nombre={item.username} tamano={44} />
              <Text style={styles.nombre}>{item.username}</Text>
              <View style={[styles.casilla, marcado && styles.casillaOn]}>
                {marcado && <IconCheck size={16} color={COLORS.onAccent} strokeWidth={3} />}
              </View>
            </Pressable>
          );
        }}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      <View style={[styles.pieBoton, { bottom: insets.bottom + 20 }]}>
        <Pressable
          onPress={() => void empezar()}
          disabled={elegidos.length === 0 || creando}
          style={[styles.boton, (elegidos.length === 0 || creando) && { opacity: 0.4 }]}
        >
          <Text style={styles.botonTexto}>
            {elegidos.length === 0 ? 'Elige a quién escribir' : esGrupo ? `Crear grupo (${elegidos.length})` : 'Escribir'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12 },
  titulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  grupo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  campoNombre: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 16,
    fontFamily: FUENTES.texto,
  },
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
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 10 },
  nombre: { flex: 1, color: COLORS.text, fontSize: 16, fontFamily: FUENTES.texto },
  casilla: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  casillaOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  vacio: { color: COLORS.textMuted, fontSize: 15, fontFamily: FUENTES.texto, textAlign: 'center', marginTop: 40, paddingHorizontal: 36 },
  error: { color: COLORS.error, fontSize: 13, fontFamily: FUENTES.texto, textAlign: 'center', marginBottom: 90 },
  pieBoton: { position: 'absolute', left: 20, right: 20 },
  boton: { height: 52, borderRadius: 999, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { color: COLORS.onAccent, fontSize: 16, fontFamily: FUENTES.titulo },
});
