/**
 * ARCHIVO: screens/MatchConfigScreen.tsx
 * DESCRIPCIÓN: Preparar un Movie Match. Desde un chat juegan todos sus miembros; sin chat,
 * se eligen amigos a mano. Se decide cuántas coincidencias buscar, dónde lo veis (plataformas) y
 * se genera el mazo. Las plataformas de los demás son privadas: por defecto salen marcadas las
 * tuyas (las de Ajustes) y puedes marcar las de quien juega contigo.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconCheck,
  IconFilterOff,
  IconPlayerPlay,
  IconSearch,
  IconX,
} from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { useSocialData } from '../hooks/social/useSocialData';
import { nombreDe, usePerfiles } from '../hooks/usePerfiles';
import { crearMatch } from '../services/repositorioMatches';
import { observarChat } from '../services/repositorioChats';
import { Avatar } from '../components/common/Avatar';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';
import { HojaAcciones } from '../components/common/HojaAcciones';
import { usePlataformasRegion } from '../hooks/usePlataformasRegion';
import { generarMazo, MINIMO_MAZO } from '../services/mazoMatch';
import { logoUrl } from '../services/tmdbClient';
import { cargarPlataformas } from '../storage/preferences';
import type { CartaMazo, Chat } from '../types';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';
import { Pulsable } from '../components/common/Pulsable';

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
  // Dónde lo veis: con filtro, solo entran pelis que estén en alguna plataforma marcada
  const { data: catalogo = [] } = usePlataformasRegion();
  const [filtrar, setFiltrar] = useState(false);
  const [marcadas, setMarcadas] = useState<number[]>([]);
  const [mazoCorto, setMazoCorto] = useState<CartaMazo[] | null>(null);

  useEffect(() => {
    void cargarPlataformas().then((ids) => {
      const mias = ids.map(Number).filter(Boolean);
      setMarcadas(mias);
      setFiltrar(mias.length > 0);
    });
  }, []);

  const alternarPlataforma = (ids: number[]) =>
    setMarcadas((prev) =>
      ids.some((id) => prev.includes(id))
        ? prev.filter((id) => !ids.includes(id))
        : [...prev, ...ids],
    );

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

  const crear = async (mazo?: CartaMazo[]) => {
    if (!user) return;
    setCreando(true);
    setError(null);
    try {
      const matchId = await crearMatch({
        chat,
        participantes,
        objetivo,
        nombreCreador: user.displayName || 'Alguien',
        mazo,
      });
      navigation.replace('MovieMatch', { matchId });
    } catch {
      setError('No hemos podido preparar el Match. Revisa la conexión.');
      setCreando(false);
    }
  };

  // Con filtro: el mazo se genera antes para avisar si sale corto, en vez de una baraja vacía
  const empezar = async () => {
    if (!user || participantes.length === 0 || creando) return;
    if (!filtrar || marcadas.length === 0) {
      void crear();
      return;
    }
    setCreando(true);
    setError(null);
    try {
      const mazo = await generarMazo([user.uid, ...participantes], marcadas);
      if (mazo.length < MINIMO_MAZO) {
        setCreando(false);
        setMazoCorto(mazo);
        return;
      }
      await crear(mazo);
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
          <Pulsable
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
          </Pulsable>
        ))}
      </View>
      <Text style={styles.ayuda}>
        El Match termina al encontrar {objetivo} {objetivo === 1 ? 'peli' : 'pelis'} que os gusten a
        todos, o antes si alguien lo cierra. El mazo mezcla el Por ver de cada uno, recomendaciones
        para el grupo y las Vistas de quien lo permite.
      </Text>
      <Text style={[styles.etiqueta, { marginTop: 12 }]}>¿Dónde lo veis?</Text>
      <View style={styles.segmentos}>
        {([true, false] as const).map((v) => (
          <Pulsable
            key={String(v)}
            onPress={() => setFiltrar(v)}
            style={[styles.segmento, filtrar === v && styles.segmentoOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: filtrar === v }}
          >
            <Text style={[styles.segmentoTexto, filtrar === v && styles.segmentoTextoOn]}>
              {v ? 'Elegir plataformas' : 'Todas'}
            </Text>
          </Pulsable>
        ))}
      </View>
      {filtrar && (
        <>
          <View style={styles.logos}>
            {catalogo.map((g) => {
              const on = g.ids.some((id) => marcadas.includes(id));
              return (
                <Pulsable
                  key={g.name}
                  onPress={() => alternarPlataforma(g.ids)}
                  style={[styles.logo, on && styles.logoOn]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={g.name}
                >
                  <Image
                    source={{ uri: logoUrl(g.logo) ?? undefined }}
                    style={[styles.logoImagen, !on && { opacity: 0.3 }]}
                    cachePolicy="memory-disk"
                  />
                </Pulsable>
              );
            })}
          </View>
          <Text style={styles.ayuda}>
            Salen marcadas las tuyas. Marca también las de quien juega contigo. Datos de
            plataformas: JustWatch.
          </Text>
        </>
      )}
      <Text style={[styles.etiqueta, { marginTop: 12 }]}>{chatId ? 'Jugáis' : '¿Con quién?'}</Text>
    </View>
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecera}>
        <Pulsable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Cerrar">
          <IconX size={26} color={COLORS.text} strokeWidth={2} />
        </Pulsable>
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
              <Pulsable
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
              </Pulsable>
            );
          }}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {/* Mazo corto con el filtro: se avisa y se elige, en vez de enseñar una baraja vacía */}
      <HojaAcciones
        visible={Boolean(mazoCorto)}
        onCerrar={() => setMazoCorto(null)}
        cabecera={
          <View style={styles.avisoCorto}>
            <Text style={styles.etiqueta}>
              {mazoCorto?.length
                ? `Con esas plataformas solo hay ${mazoCorto.length} ${mazoCorto.length === 1 ? 'peli' : 'pelis'}`
                : 'Con esas plataformas no hay pelis'}
            </Text>
            <Text style={styles.ayuda}>Puedes quitar el filtro o marcar más plataformas.</Text>
          </View>
        }
        acciones={[
          {
            texto: 'Quitar el filtro',
            icono: (c) => <IconFilterOff size={22} color={c} />,
            onPress: () => {
              setFiltrar(false);
              void crear();
            },
          },
          ...(mazoCorto?.length
            ? [
                {
                  texto: 'Jugar igual',
                  icono: (c: string) => <IconPlayerPlay size={22} color={c} />,
                  onPress: () => void crear(mazoCorto),
                },
              ]
            : []),
        ]}
      />
      <View style={[styles.pieBoton, { bottom: insets.bottom + 20 }]}>
        <Pulsable
          onPress={() => void empezar()}
          disabled={participantes.length === 0}
          style={[styles.boton, participantes.length === 0 && { opacity: 0.4 }]}
        >
          <Text style={styles.botonTexto}>
            {participantes.length === 0 ? 'Elige al menos un amigo' : 'Empezar'}
          </Text>
        </Pulsable>
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
  segmentos: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  segmento: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentoOn: { backgroundColor: COLORS.primary },
  segmentoTexto: { color: COLORS.text, fontSize: 14, fontFamily: FUENTES.texto },
  segmentoTextoOn: { color: COLORS.onAccent, fontFamily: FUENTES.titulo },
  logos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  logoOn: { borderColor: COLORS.accent },
  logoImagen: { width: '100%', height: '100%', borderRadius: 11 },
  avisoCorto: {
    gap: 6,
    padding: 18,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
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
