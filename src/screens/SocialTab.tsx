/**
 * ARCHIVO: screens/SocialTab.tsx
 * DESCRIPCIÓN: Pestaña Social: tus amigos, el buscador de personas (nombre exacto o código
 * de amigo) y las solicitudes pendientes. El muro de actividad de los amigos llega en D4.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMuro } from '../hooks/social/useMuro';
import { MuroAmigos } from '../components/social/MuroAmigos';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { IconCards, IconCopy } from '@tabler/icons-react-native';
import { useSocialData } from '../hooks/social/useSocialData';
import { useAuth } from '../context/AuthContext';
import { observarUsuario } from '../services/repositorioUsuarios';
import { observarMisMatchesActivos } from '../services/repositorioMatches';
import type { MovieMatch, UsuarioPerfil } from '../types';
import { Avatar } from '../components/common/Avatar';
import { FriendRow } from '../components/social/FriendRow';
import { UserSearchRow } from '../components/social/UserSearchRow';
import { SolicitudesBadge } from '../components/social/SolicitudesBadge';
import { IconoPalomitas } from '../components/iconos/IconosPropios';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';
import { Pulsable } from '../components/common/Pulsable';
import { BotonPrincipal, Segmentos } from '../components/common/Botones';
import { CampoBusqueda } from '../components/common/Campos';

type Props = {
  fontFamily: string;
  onUsuarioClick: (uid: string) => void;
  onSolicitudesClick: () => void;
  onPerfilClick?: () => void;
  onNuevoMatch: () => void;
  onAbrirMatch: (matchId: string) => void;
  onPeliClick: (movieId: number) => void;
  userFoto?: string | null;
};

export function SocialTab({
  fontFamily,
  onUsuarioClick,
  onSolicitudesClick,
  onPerfilClick,
  onNuevoMatch,
  onAbrirMatch,
  onPeliClick,
  userFoto,
}: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [seccion, setSeccion] = useState<'muro' | 'amigos' | 'buscar'>('muro');
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
  useEffect(
    () => (user ? observarUsuario(user.uid, (p) => setMiCodigo(p.codigoAmigo ?? null)) : undefined),
    [user],
  );
  // Matches en curso (si falla, p. ej. sin índice todavía, simplemente no se enseñan)
  const [matches, setMatches] = useState<MovieMatch[]>([]);
  useEffect(
    () =>
      user
        ? observarMisMatchesActivos(
            user.uid,
            (m) => setMatches(m.filter((x) => Array.isArray(x.mazo))),
            () => setMatches([]),
          )
        : undefined,
    [user],
  );

  const {
    muro,
    categorias,
    cargando: cargandoMuro,
    recargar: recargarMuro,
    refrescando,
  } = useMuro(amigos);
  const perfilesAmigos = useMemo(() => {
    const mapa: Record<string, UsuarioPerfil | undefined> = {};
    amigos.forEach((a) => (mapa[a.uid] = a));
    return mapa;
  }, [amigos]);

  const amigosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return q ? amigos.filter((a) => a.username.toLowerCase().includes(q)) : amigos;
  }, [amigos, filtro]);

  return (
    <View style={styles.flex}>
      <View style={[styles.cabecera, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.titulo}>Social</Text>
        {/* El Movie Match se empieza desde aquí (siempre a mano) o desde un chat */}
        <Pulsable
          onPress={onNuevoMatch}
          hitSlop={8}
          style={styles.botonMatch}
          accessibilityRole="button"
          accessibilityLabel="Nuevo Movie Match con amigos"
        >
          <IconCards size={22} color={COLORS.accent} strokeWidth={2} />
        </Pulsable>
        <Pulsable onPress={onPerfilClick} hitSlop={8} accessibilityLabel="Tu perfil">
          <Avatar uri={userFoto} nombre={user?.displayName} tamano={40} />
        </Pulsable>
      </View>

      <SolicitudesBadge
        count={solPendientesCount}
        onPress={onSolicitudesClick}
        fontFamily={fontFamily}
      />

      <Segmentos
        estilo={styles.segmento}
        valor={seccion}
        onCambio={setSeccion}
        opciones={[
          { valor: 'muro', texto: 'Muro' },
          { valor: 'amigos', texto: `Amigos${amigos.length ? ` (${amigos.length})` : ''}` },
          { valor: 'buscar', texto: 'Añadir amigos' },
        ]}
      />

      {seccion === 'muro' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => void recargarMuro()}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Matches en curso: solo si hay alguno (nada de huecos vacíos) */}
          {matches.length > 0 && (
            <View style={styles.match}>
              {matches.map((m) => (
                <Pulsable
                  key={m.id}
                  style={styles.matchEnCurso}
                  onPress={() => onAbrirMatch(m.id)}
                  accessibilityLabel="Seguir el Movie Match en curso"
                >
                  <View style={styles.punto} />
                  <Text style={styles.matchEnCursoTexto} numberOfLines={1}>
                    Match en curso · {m.participants.length} personas · {m.coincidencias.length}/
                    {m.objetivo}
                  </Text>
                  <Text style={styles.matchSeguir}>Seguir</Text>
                </Pulsable>
              ))}
            </View>
          )}
          <MuroAmigos
            muro={muro}
            categorias={categorias}
            cargando={cargandoMuro}
            perfiles={perfilesAmigos}
            onPeli={onPeliClick}
          />
        </ScrollView>
      ) : seccion === 'amigos' ? (
        <FlatList
          data={amigosFiltrados}
          keyExtractor={(a) => a.uid}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
          ListHeaderComponent={
            amigos.length > 6 ? (
              <CampoBusqueda value={filtro} onChangeText={setFiltro} placeholder="Filtrar amigos" />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.vacio}>
              <IconoPalomitas size={64} />
              <Text style={styles.vacioTitulo}>Aún no tienes amigos aquí</Text>
              <Text style={styles.vacioTexto}>
                Añádelos por su nombre o su código y verás lo que ven.
              </Text>
              <BotonPrincipal
                texto="Añadir amigos"
                onPress={() => setSeccion('buscar')}
                estilo={styles.boton}
              />
            </View>
          }
          renderItem={({ item }) => (
            <FriendRow
              amigo={item}
              onPress={() => onUsuarioClick(item.uid)}
              fontFamily={fontFamily}
            />
          )}
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
                <Pulsable
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
                </Pulsable>
              )}
              <CampoBusqueda
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Nombre de usuario exacto o código"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.ayuda}>
                Para encontrar a alguien, pídele su nombre exacto en VeoVeo o su código de 6 letras.
              </Text>
            </View>
          }
          ListEmptyComponent={
            busqueda.trim().length >= 3 && !cargando ? (
              <Text style={styles.ayuda}>No hay nadie con ese nombre o código.</Text>
            ) : null
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
  botonMatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(105,223,217,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(105,223,217,0.45)',
  },
  flex: { flex: 1, backgroundColor: COLORS.background },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titulo: {
    flex: 1,
    color: COLORS.text,
    fontSize: 28,
    fontFamily: FUENTES.titulo,
    letterSpacing: -0.3,
  },
  match: { paddingHorizontal: 20, marginBottom: 14, gap: 8 },
  matchEnCurso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  matchEnCursoTexto: { flex: 1, color: COLORS.text, fontSize: 14, fontFamily: FUENTES.texto },
  matchSeguir: { color: COLORS.accent, fontSize: 14, fontFamily: FUENTES.titulo },
  segmento: { marginHorizontal: 20, marginBottom: 12 },
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
  vacioTitulo: {
    color: COLORS.text,
    fontSize: 20,
    fontFamily: FUENTES.titulo,
    textAlign: 'center',
  },
  vacioTexto: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
  },
  boton: { marginTop: 8, paddingHorizontal: 32 },
});
