/**
 * ARCHIVO: screens/ConversacionScreen.tsx
 * DESCRIPCIÓN: Una conversación (1:1 o grupo), rehecha para la 3.0:
 * separadores por día, hora y ✓/✓✓ en cada mensaje, remitente en grupos, responder (cita),
 * editar, borrar para todos («Mensaje eliminado») o solo para mí, copiar, compartir una peli
 * y el Movie Match del chat. Carga 40 mensajes y el resto al subir.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  IconArrowBackUp,
  IconBan,
  IconCards,
  IconCheck,
  IconChecks,
  IconChevronLeft,
  IconCopy,
  IconEyeOff,
  IconPencil,
  IconPlus,
  IconSend,
  IconTrash,
  IconX,
} from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { useChats } from '../context/ChatsContext';
import { nombreDe, usePerfiles } from '../hooks/usePerfiles';
import {
  borrarMensajeParaMi,
  borrarMensajeParaTodos,
  cargarMensajesAnteriores,
  editarMensaje,
  enviarMensaje,
  marcarLeido,
  observarChat,
  observarMensajesRecientes,
  observarMiembros,
} from '../services/repositorioChats';
import { desbloquearUsuario, observarBloqueados } from '../services/repositorioUsuarios';
import { posterUrl } from '../services/tmdbClient';
import { Avatar } from '../components/common/Avatar';
import { HojaAcciones, type Accion } from '../components/common/HojaAcciones';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';
import { ChatPlusMenu } from '../components/chat/ChatPlusMenu';
import { ChatMoviePicker } from '../components/chat/ChatMoviePicker';
import { presentacionChat } from './ChatsTab';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';
import { esOtroDia, formatearHora, formatearSeparadorDia } from '../utils/fechas';
import type { Chat, Message, MiembroChat } from '../types';

// Colores para distinguir remitentes en los grupos (contraste suficiente sobre la burbuja oscura)
const COLORES_REMITENTE = ['#F59E0B', '#22C55E', '#F472B6', '#69DFD9', '#A3E635', '#FB923C', '#C084FC'];
const colorDe = (uid: string) => COLORES_REMITENTE[[...uid].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORES_REMITENTE.length];

type Elemento = { tipo: 'mensaje'; mensaje: Message } | { tipo: 'dia'; clave: string; momento: number };

export function ConversacionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const yo = user?.uid ?? '';
  const { chatId } = route.params as { chatId: string };
  const { estado } = useChats();
  const ocultoDesde = estado[chatId]?.ocultoDesde ?? 0;

  const [chat, setChat] = useState<Chat | null | undefined>(undefined);
  const [recientes, setRecientes] = useState<Message[]>([]);
  const [anteriores, setAnteriores] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [miembros, setMiembros] = useState<Record<string, MiembroChat>>({});
  const [bloqueados, setBloqueados] = useState<string[]>([]);
  const [texto, setTexto] = useState('');
  const [respondiendo, setRespondiendo] = useState<Message | null>(null);
  const [editando, setEditando] = useState<Message | null>(null);
  const [seleccionado, setSeleccionado] = useState<Message | null>(null);
  const [menuMas, setMenuMas] = useState(false);
  const [selectorPelis, setSelectorPelis] = useState<'vista' | 'por_ver' | 'explorar' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => observarChat(chatId, setChat), [chatId]);
  useEffect(
    () =>
      observarMensajesRecientes(chatId, (mensajes, siguiente) => {
        setRecientes(mensajes);
        setCursor((actual) => actual ?? siguiente);
      }),
    [chatId],
  );
  useEffect(() => observarMiembros(chatId, setMiembros), [chatId]);
  useEffect(() => observarBloqueados(setBloqueados), []);

  const participantes = chat?.participants ?? [];
  const autores = useMemo(() => [...recientes, ...anteriores].map((m) => m.senderId), [recientes, anteriores]);
  const perfiles = usePerfiles([...participantes, ...autores, yo]);
  const yoNombre = nombreDe(perfiles[yo], true);

  // Mensajes visibles: sin los que he ocultado y sin los anteriores a «borrar el chat para mí»
  const mensajes = useMemo(() => {
    const vistos = new Set<string>();
    return [...recientes, ...anteriores].filter((m) => {
      if (vistos.has(m.id)) return false;
      vistos.add(m.id);
      return !(m.ocultoPara ?? []).includes(yo) && m.timestamp > ocultoDesde;
    });
  }, [recientes, anteriores, yo, ocultoDesde]);

  // Lista invertida: del más nuevo al más viejo, con un separador al cambiar de día
  const elementos = useMemo<Elemento[]>(() => {
    const lista: Elemento[] = [];
    mensajes.forEach((m, i) => {
      lista.push({ tipo: 'mensaje', mensaje: m });
      const anterior = mensajes[i + 1];
      if (!anterior || esOtroDia(m.timestamp, anterior.timestamp)) {
        lista.push({ tipo: 'dia', clave: `dia-${m.timestamp}`, momento: m.timestamp });
      }
    });
    return lista;
  }, [mensajes]);

  // Marcar como leído al ver mensajes nuevos de otros
  const ultimo = recientes[0];
  useEffect(() => {
    if (ultimo && ultimo.senderId !== yo) void marcarLeido(chatId, ultimo.timestamp).catch(() => undefined);
  }, [chatId, ultimo?.id, yo]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarMas = useCallback(async () => {
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const { mensajes: mas, cursor: siguiente } = await cargarMensajesAnteriores(chatId, cursor);
      setAnteriores((prev) => [...prev, ...mas]);
      setCursor(siguiente);
    } finally {
      setCargandoMas(false);
    }
  }, [chatId, cursor, cargandoMas]);

  if (chat === undefined) {
    return (
      <View style={[styles.flex, styles.centro]}>
        <LoaderClaqueta />
      </View>
    );
  }

  const sigoDentro = Boolean(chat && chat.participants.includes(yo));
  const presentacion = chat ? presentacionChat(chat, yo, perfiles) : null;
  const otroUid = chat?.type === 'individual' ? chat.participants.find((p) => p !== yo) : undefined;
  const leBloqueé = otroUid ? bloqueados.includes(otroUid) : false;
  const otro = otroUid ? perfiles[otroUid] : undefined;
  const enLinea = otro?.estado === 'online' && Date.now() - (otro.ultimoAcceso ?? 0) < 1000 * 60 * 10;
  const subtitulo =
    chat?.type === 'group'
      ? `${chat.participants.length} miembros`
      : enLinea
        ? 'en línea'
        : '';

  const leidoPorTodos = (m: Message) => {
    const otros = (chat?.participants ?? []).filter((p) => p !== yo);
    return otros.length > 0 && otros.every((p) => (miembros[p]?.ultimaLectura ?? 0) >= m.timestamp);
  };

  const enviar = async () => {
    if (!chat) return;
    const limpio = texto.trim();
    if (!limpio) return;
    setAviso(null);
    try {
      if (editando) {
        await editarMensaje(chat.id, editando.id, limpio);
        setEditando(null);
      } else {
        await enviarMensaje(
          chat,
          {
            type: 'text',
            text: limpio,
            respuestaA: respondiendo
              ? { msgId: respondiendo.id, senderId: respondiendo.senderId, text: respondiendo.text.slice(0, 120) }
              : undefined,
          },
          yoNombre,
        );
        setRespondiendo(null);
      }
      setTexto('');
    } catch {
      setAviso(
        chat.type === 'individual'
          ? 'No hemos podido enviar el mensaje. Si ya no sois amigos o te ha bloqueado, no podrás escribirle.'
          : 'No hemos podido enviar el mensaje. Revisa la conexión.',
      );
    }
  };

  const compartirPeli = async (peli: { id: number; title: string; posterPath: string }) => {
    setSelectorPelis(null);
    if (!chat) return;
    try {
      await enviarMensaje(chat, { type: 'movie', text: peli.title, movieData: peli }, yoNombre);
    } catch {
      setAviso('No hemos podido compartir la peli.');
    }
  };

  const abrirMatch = () => {
    if (!chat) return;
    if (chat.activeMatchId) navigation.navigate('MovieMatch', { matchId: chat.activeMatchId });
    else navigation.navigate('MatchConfig', { chatId: chat.id });
  };

  const accionesMensaje = (m: Message): Accion[] => {
    if (!chat || m.eliminado) return [];
    const mio = m.senderId === yo;
    const lista: Accion[] = [
      {
        texto: 'Responder',
        icono: (c) => <IconArrowBackUp size={22} color={c} />,
        onPress: () => {
          setEditando(null);
          setRespondiendo(m);
          inputRef.current?.focus();
        },
      },
    ];
    if (m.text) {
      lista.push({ texto: 'Copiar', icono: (c) => <IconCopy size={22} color={c} />, onPress: () => void Clipboard.setStringAsync(m.text) });
    }
    if (mio && m.type === 'text') {
      lista.push({
        texto: 'Editar',
        icono: (c) => <IconPencil size={22} color={c} />,
        onPress: () => {
          setRespondiendo(null);
          setEditando(m);
          setTexto(m.text);
          inputRef.current?.focus();
        },
      });
    }
    if (mio) {
      lista.push({
        texto: 'Borrar para todos',
        icono: (c) => <IconTrash size={22} color={c} />,
        onPress: () => void borrarMensajeParaTodos(chat, m),
        peligro: true,
      });
    }
    lista.push({ texto: 'Borrar solo para mí', icono: (c) => <IconEyeOff size={22} color={c} />, onPress: () => void borrarMensajeParaMi(chat.id, m.id) });
    return lista;
  };

  const renderElemento = ({ item }: { item: Elemento }) => {
    if (item.tipo === 'dia') {
      return (
        <View style={styles.separador}>
          <Text style={styles.separadorTexto}>{formatearSeparadorDia(item.momento)}</Text>
        </View>
      );
    }
    const m = item.mensaje;
    const mio = m.senderId === yo;

    if (m.type === 'sistema') {
      return <Text style={styles.sistema}>{m.text}</Text>;
    }
    if (m.eliminado) {
      return (
        <View style={[styles.eliminado, mio ? styles.derecha : styles.izquierda]}>
          <IconBan size={15} color={COLORS.textMuted} strokeWidth={2} />
          <Text style={styles.eliminadoTexto}>Mensaje eliminado</Text>
        </View>
      );
    }

    const remitente = chat?.type === 'group' && !mio ? (
      <Text style={[styles.remitente, { color: colorDe(m.senderId) }]}>{nombreDe(perfiles[m.senderId], true)}</Text>
    ) : null;
    const pie = (
      <View style={styles.pie}>
        <Text style={[styles.hora, mio && { color: 'rgba(2,6,23,0.65)' }]}>
          {formatearHora(m.timestamp)}
          {m.editadoEn ? ' · editado' : ''}
        </Text>
        {mio &&
          (leidoPorTodos(m) ? (
            <IconChecks size={15} color="rgba(2,6,23,0.75)" strokeWidth={2.2} />
          ) : (
            <IconCheck size={15} color="rgba(2,6,23,0.55)" strokeWidth={2.2} />
          ))}
      </View>
    );

    if ((m.type === 'match_invite' || m.type === 'match_result') && m.matchId) {
      const enCurso = m.type === 'match_invite' && chat?.activeMatchId === m.matchId;
      return (
        <View style={styles.tarjetaMatch}>
          {m.type === 'match_invite' ? remitente : null}
          <View style={styles.matchFila}>
            <IconCards size={18} color={COLORS.accent} strokeWidth={2} />
            <Text style={styles.matchTitulo}>{m.type === 'match_result' ? 'Resultado del Movie Match' : 'Movie Match'}</Text>
          </View>
          <Text style={styles.matchTexto}>{m.text}</Text>
          <Pressable style={styles.matchBoton} onPress={() => navigation.navigate('MovieMatch', { matchId: m.matchId! })}>
            <Text style={styles.matchBotonTexto}>{enCurso ? 'Jugar' : 'Ver coincidencias'}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.filaMensaje, mio ? styles.derecha : styles.izquierda]}>
        {remitente}
        <Pressable
          onLongPress={() => setSeleccionado(m)}
          delayLongPress={250}
          onPress={m.type === 'movie' && m.movieData ? () => navigation.navigate('Pelicula', { movieId: m.movieData!.id }) : undefined}
          style={[styles.burbuja, mio ? styles.burbujaMia : styles.burbujaOtro, m.type === 'movie' && styles.burbujaPeli]}
        >
          {m.respuestaA ? (
            <View style={[styles.cita, mio && styles.citaMia]}>
              <Text style={[styles.citaAutor, mio && { color: COLORS.onAccent }]}>
                {m.respuestaA.senderId === yo ? 'Tú' : nombreDe(perfiles[m.respuestaA.senderId], true)}
              </Text>
              <Text style={[styles.citaTexto, mio && { color: 'rgba(2,6,23,0.8)' }]} numberOfLines={2}>
                {m.respuestaA.text || 'Mensaje eliminado'}
              </Text>
            </View>
          ) : null}
          {m.type === 'movie' && m.movieData ? (
            <View>
              {m.movieData.posterPath ? (
                <Image source={{ uri: posterUrl(m.movieData.posterPath, 'w342')! }} style={styles.poster} contentFit="cover" cachePolicy="memory-disk" />
              ) : null}
              <Text style={[styles.textoMensaje, mio && styles.textoMio, { fontFamily: FUENTES.titulo, marginTop: 8 }]}>{m.movieData.title}</Text>
              <Text style={[styles.hora, mio && { color: 'rgba(2,6,23,0.65)' }]}>Toca para ver la ficha</Text>
            </View>
          ) : (
            <Text style={[styles.textoMensaje, mio && styles.textoMio]}>{m.text}</Text>
          )}
          {pie}
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.cabecera, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Volver">
          <IconChevronLeft size={28} color={COLORS.text} strokeWidth={2} />
        </Pressable>
        <Pressable
          style={styles.cabeceraCentro}
          onPress={() => {
            if (chat?.type === 'group') navigation.navigate('InfoGrupo', { chatId });
            else if (otroUid) navigation.navigate('BibliotecaAmigo', { amigoUid: otroUid });
          }}
          accessibilityRole="button"
        >
          {presentacion?.emoji ? (
            <View style={styles.emoji}>
              <Text style={{ fontSize: 20 }}>{presentacion.emoji}</Text>
            </View>
          ) : (
            <Avatar uri={presentacion?.foto} nombre={presentacion?.titulo} tamano={40} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.cabeceraTitulo} numberOfLines={1}>
              {presentacion?.titulo ?? 'Chat'}
            </Text>
            {subtitulo ? <Text style={styles.cabeceraSub}>{subtitulo}</Text> : null}
          </View>
        </Pressable>
        {sigoDentro && (
          <Pressable
            onPress={abrirMatch}
            style={[styles.botonMatch, chat?.activeMatchId && styles.botonMatchActivo]}
            accessibilityLabel={chat?.activeMatchId ? 'Seguir el Movie Match' : 'Nuevo Movie Match'}
          >
            <IconCards size={20} color={chat?.activeMatchId ? COLORS.onAccent : COLORS.accent} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={elementos}
        inverted
        keyExtractor={(e) => (e.tipo === 'dia' ? e.clave : e.mensaje.id)}
        renderItem={renderElemento}
        contentContainerStyle={styles.lista}
        onEndReached={() => void cargarMas()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={cargandoMas ? <ActivityIndicator color={COLORS.textMuted} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={
          <View style={[styles.centro, { transform: [{ scaleY: -1 }], paddingVertical: 40 }]}>
            <Text style={styles.vacioTexto}>Escribe el primer mensaje.</Text>
          </View>
        }
        keyboardDismissMode="on-drag"
      />

      {aviso && <Text style={styles.aviso}>{aviso}</Text>}

      {!sigoDentro ? (
        <View style={[styles.franja, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.franjaTexto}>Ya no estás en este grupo.</Text>
        </View>
      ) : leBloqueé && otroUid ? (
        <View style={[styles.franja, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.franjaTexto}>Has bloqueado a {nombreDe(otro)}.</Text>
          <Pressable onPress={() => void desbloquearUsuario(otroUid)}>
            <Text style={styles.franjaEnlace}>Desbloquear</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ paddingBottom: insets.bottom + 8 }}>
          {(respondiendo || editando) && (
            <View style={styles.barraContexto}>
              <View style={{ flex: 1 }}>
                <Text style={styles.barraTitulo}>
                  {editando
                    ? 'Editando mensaje'
                    : `Respondiendo a ${respondiendo!.senderId === yo ? 'ti' : nombreDe(perfiles[respondiendo!.senderId])}`}
                </Text>
                <Text style={styles.barraTexto} numberOfLines={1}>
                  {(editando ?? respondiendo)!.text}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setRespondiendo(null);
                  if (editando) setTexto('');
                  setEditando(null);
                }}
                hitSlop={10}
                accessibilityLabel="Cancelar"
              >
                <IconX size={20} color={COLORS.textMuted} />
              </Pressable>
            </View>
          )}
          <View style={styles.entrada}>
            <Pressable onPress={() => setMenuMas((v) => !v)} style={styles.botonMas} accessibilityLabel="Compartir una peli">
              <IconPlus size={22} color={COLORS.text} strokeWidth={2} />
            </Pressable>
            <TextInput
              ref={inputRef}
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribe un mensaje"
              placeholderTextColor={COLORS.textMuted}
              style={styles.campo}
              multiline
              maxLength={2000}
            />
            <Pressable
              onPress={() => void enviar()}
              disabled={!texto.trim()}
              style={[styles.botonEnviar, !texto.trim() && { opacity: 0.4 }]}
              accessibilityLabel={editando ? 'Guardar cambios' : 'Enviar'}
            >
              {editando ? <IconCheck size={22} color={COLORS.onAccent} strokeWidth={2.4} /> : <IconSend size={20} color={COLORS.onAccent} strokeWidth={2} />}
            </Pressable>
          </View>
        </View>
      )}

      <ChatPlusMenu
        visible={menuMas}
        onSelect={(modo) => {
          setMenuMas(false);
          setSelectorPelis(modo);
        }}
        fontFamily={FUENTES.texto}
      />
      <ChatMoviePicker
        visible={selectorPelis !== null}
        mode={selectorPelis}
        onClose={() => setSelectorPelis(null)}
        onSelect={(p) => void compartirPeli(p)}
        fontFamily={FUENTES.texto}
      />
      <HojaAcciones
        visible={Boolean(seleccionado)}
        onCerrar={() => setSeleccionado(null)}
        acciones={seleccionado ? accionesMensaje(seleccionado) : []}
        cabecera={
          seleccionado ? (
            <View style={[styles.burbuja, seleccionado.senderId === yo ? styles.burbujaMia : styles.burbujaOtro, { alignSelf: seleccionado.senderId === yo ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.textoMensaje, seleccionado.senderId === yo && styles.textoMio]} numberOfLines={4}>
                {seleccionado.type === 'movie' ? `🎬 ${seleccionado.movieData?.title ?? ''}` : seleccionado.text}
              </Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  centro: { alignItems: 'center', justifyContent: 'center' },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    backgroundColor: COLORS.background,
  },
  cabeceraCentro: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cabeceraTitulo: { color: COLORS.text, fontSize: 17, fontFamily: FUENTES.titulo },
  cabeceraSub: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto },
  emoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(105,223,217,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(105,223,217,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonMatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(105,223,217,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonMatchActivo: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  lista: { paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  separador: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  separadorTexto: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto },
  sistema: { alignSelf: 'center', color: COLORS.textMuted, fontSize: 13, fontFamily: FUENTES.texto, marginVertical: 6, textAlign: 'center' },
  filaMensaje: { maxWidth: '80%' },
  derecha: { alignSelf: 'flex-end' },
  izquierda: { alignSelf: 'flex-start' },
  remitente: { fontSize: 12, fontFamily: FUENTES.titulo, marginBottom: 3, marginLeft: 6 },
  burbuja: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  burbujaMia: { backgroundColor: COLORS.primary, borderBottomRightRadius: 6 },
  burbujaOtro: { backgroundColor: COLORS.card, borderBottomLeftRadius: 6 },
  burbujaPeli: { padding: 8, width: 220 },
  textoMensaje: { color: COLORS.text, fontSize: 16, lineHeight: 22, fontFamily: FUENTES.texto },
  textoMio: { color: COLORS.onAccent },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 14 },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  hora: { color: COLORS.textMuted, fontSize: 11, fontFamily: FUENTES.texto },
  cita: { borderLeftWidth: 3, borderLeftColor: COLORS.accent, paddingLeft: 8, paddingVertical: 4, marginBottom: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  citaMia: { borderLeftColor: COLORS.onAccent, backgroundColor: 'rgba(2,6,23,0.12)' },
  citaAutor: { color: COLORS.accent, fontSize: 12, fontFamily: FUENTES.titulo },
  citaTexto: { color: COLORS.textMuted, fontSize: 13, fontFamily: FUENTES.texto },
  eliminado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  eliminadoTexto: { color: COLORS.textMuted, fontSize: 14, fontFamily: FUENTES.texto, fontStyle: 'italic' },
  tarjetaMatch: {
    alignSelf: 'center',
    width: 280,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(105,223,217,0.4)',
    backgroundColor: 'rgba(105,223,217,0.08)',
    marginVertical: 4,
  },
  matchFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchTitulo: { color: COLORS.accent, fontSize: 16, fontFamily: FUENTES.titulo },
  matchTexto: { color: COLORS.textMuted, fontSize: 14, fontFamily: FUENTES.texto, marginVertical: 8 },
  matchBoton: { height: 40, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  matchBotonTexto: { color: COLORS.onAccent, fontSize: 14, fontFamily: FUENTES.titulo },
  vacioTexto: { color: COLORS.textMuted, fontSize: 15, fontFamily: FUENTES.texto },
  aviso: { color: COLORS.error, fontSize: 13, fontFamily: FUENTES.texto, paddingHorizontal: 20, paddingBottom: 6 },
  franja: { alignItems: 'center', gap: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)' },
  franjaTexto: { color: COLORS.textMuted, fontSize: 14, fontFamily: FUENTES.texto },
  franjaEnlace: { color: COLORS.primary, fontSize: 14, fontFamily: FUENTES.titulo },
  barraContexto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  barraTitulo: { color: COLORS.accent, fontSize: 12, fontFamily: FUENTES.titulo },
  barraTexto: { color: COLORS.textMuted, fontSize: 13, fontFamily: FUENTES.texto },
  entrada: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12 },
  botonMas: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campo: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: COLORS.text,
    fontSize: 16,
    fontFamily: FUENTES.texto,
  },
  botonEnviar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
