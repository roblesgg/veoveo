/**
 * ARCHIVO: screens/SocialTab.tsx
 * DESCRIPCIÓN: Pestaña Social: tus amigos, el buscador de personas (nombre exacto o código
 * de amigo) y las solicitudes pendientes. El muro de actividad de los amigos llega en D4.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { IconCopy, IconSearch } from '@tabler/icons-react-native';
import { useSocialData } from '../hooks/social/useSocialData';
import { useAuth } from '../context/AuthContext';
import { observarUsuario } from '../services/repositorioUsuarios';
import { Avatar } from '../components/common/Avatar';
import { FriendRow } from '../components/social/FriendRow';
import { UserSearchRow } from '../components/social/UserSearchRow';
import { SolicitudesBadge } from '../components/social/SolicitudesBadge';
import { IconoPalomitas } from '../components/iconos/IconosPropios';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';

type Props = {
  fontFamily: string;
  onUsuarioClick: (uid: string) => void;
  onSolicitudesClick: () => void;
  onPerfilClick?: () => void;
  userFoto?: string | null;
};

export function SocialTab({ fontFamily, onUsuarioClick, onSolicitudesClick, onPerfilClick, userFoto }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [seccion, setSeccion] = useState<'amigos' | 'buscar'>('amigos');
  const [filtro, setFiltro] = useState('');
  const [miCodigo, setMiCodigo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const {
    amigos,
    resultados,
    solPendientesCount,
    solEnviadas,
    busqueda,
    setBusqueda,
    cargando,
    handleSendSolicitud,
    recargar,
  } = useSocialData();

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );
  useEffect(() => (user ? observarUsuario(user.uid, (p) => setMiCodigo(p.codigoAmigo ?? null)) : undefined), [user]);

  const amigosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return q ? amigos.filter((a) => a.username.toLowerCase().includes(q)) : amigos;
  }, [amigos, filtro]);

  return (
    <View style={styles.flex}>
      <View style={[styles.cabecera, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.titulo}>Social</Text>
        <Pressable onPress={onPerfilClick} hitSlop={8} accessibilityLabel="Tu perfil">
          <Avatar uri={userFoto} nombre={user?.displayName} tamano={40} />
        </Pressable>
      </View>

      <SolicitudesBadge count={solPendientesCount} onPress={onSolicitudesClick} fontFamily={fontFamily} />

      <View style={styles.segmento}>
        {(['amigos', 'buscar'] as const).map((s) => (
          <Pressable key={s} onPress={() => setSeccion(s)} style={[styles.segBoton, seccion === s && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: seccion === s }}>
            <Text style={[styles.segTexto, seccion === s && styles.segTextoOn]}>
              {s === 'amigos' ? `Amigos${amigos.length ? ` (${amigos.length})` : ''}` : 'Añadir amigos'}
            </Text>
          </Pressable>
        ))}
      </View>

      {seccion === 'amigos' ? (
        <FlatList
          data={amigosFiltrados}
          keyExtractor={(a) => a.uid}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
          ListHeaderComponent={
            amigos.length > 6 ? (
              <View style={styles.buscador}>
                <IconSearch size={18} color={COLORS.textMuted} strokeWidth={2} />
                <TextInput value={filtro} onChangeText={setFiltro} placeholder="Filtrar amigos" placeholderTextColor={COLORS.textMuted} style={styles.campo} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.vacio}>
              <IconoPalomitas size={64} />
              <Text style={styles.vacioTitulo}>Aún no tienes amigos aquí</Text>
              <Text style={styles.vacioTexto}>Añádelos por su nombre o su código y verás lo que ven.</Text>
              <Pressable style={styles.boton} onPress={() => setSeccion('buscar')}>
                <Text style={styles.botonTexto}>Añadir amigos</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => <FriendRow amigo={item} onPress={() => onUsuarioClick(item.uid)} fontFamily={fontFamily} />}
        />
      ) : (
        <FlatList
          data={resultados}
          keyExtractor={(u) => u.uid}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 8 }}>
              {miCodigo && (
                <Pressable
                  style={styles.codigo}
                  onPress={() => {
                    void Clipboard.setStringAsync(miCodigo);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 1600);
                  }}
                  accessibilityLabel={`Tu código de amigo es ${miCodigo}. Toca para copiarlo`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.codigoEtiqueta}>Tu código de amigo</Text>
                    <Text style={styles.codigoValor}>{miCodigo}</Text>
                  </View>
                  <Text style={styles.codigoAccion}>{copiado ? 'Copiado' : 'Copiar'}</Text>
                  <IconCopy size={18} color={COLORS.accent} strokeWidth={2} />
                </Pressable>
              )}
              <View style={styles.buscador}>
                <IconSearch size={18} color={COLORS.textMuted} strokeWidth={2} />
                <TextInput
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Nombre de usuario exacto o código"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.campo}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.ayuda}>Para encontrar a alguien, pídele su nombre exacto en VeoVeo o su código de 6 letras.</Text>
            </View>
          }
          ListEmptyComponent={
            busqueda.trim().length >= 3 && !cargando ? <Text style={styles.ayuda}>No hay nadie con ese nombre o código.</Text> : null
          }
          renderItem={({ item }) => (
            <UserSearchRow
              usuario={{ ...item, fotoPerfil: item.fotoPerfil || undefined }}
              enviada={solEnviadas.has(item.uid) || amigos.some((a) => a.uid === item.uid)}
              onAdd={() => handleSendSolicitud(item.uid)}
              fontFamily={fontFamily}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  titulo: { flex: 1, color: COLORS.text, fontSize: 28, fontFamily: FUENTES.titulo, letterSpacing: -0.3 },
  segmento: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  segBoton: { height: 36, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', justifyContent: 'center' },
  segOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segTexto: { color: COLORS.text, fontSize: 14, fontFamily: FUENTES.texto },
  segTextoOn: { color: COLORS.onAccent, fontFamily: FUENTES.titulo },
  buscador: {
    height: 46,
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
  ayuda: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: FUENTES.texto },
  codigo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(105,223,217,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(105,223,217,0.35)',
  },
  codigoEtiqueta: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto },
  codigoValor: { color: COLORS.accent, fontSize: 22, fontFamily: FUENTES.titulo, letterSpacing: 3 },
  codigoAccion: { color: COLORS.accent, fontSize: 13, fontFamily: FUENTES.titulo },
  vacio: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 40, gap: 12 },
  vacioTitulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo, textAlign: 'center' },
  vacioTexto: { color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: FUENTES.texto, textAlign: 'center' },
  boton: { marginTop: 8, height: 52, paddingHorizontal: 32, borderRadius: 999, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { color: COLORS.onAccent, fontSize: 16, fontFamily: FUENTES.titulo },
});
