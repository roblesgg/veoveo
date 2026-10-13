/**
 * ARCHIVO: screens/ChatDetailScreen.tsx
 * DESCRIPCIÓN: Pantalla de chat individual o grupal.
 * Gestiona el envío de mensajes de texto, el intercambio de fichas de películas
 * y la integración visual de las invitaciones al juego 'Movie Match'.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
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
  Image,
  Keyboard,
  Animated,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useAuth } from '../context/AuthContext';
import {
  enviarMensaje,
  obtenerMensajesChat,
  observarChat,
  renombrarChat,
} from '../services/repositorioChats';
import { observarUsuario } from '../services/repositorioUsuarios';
import { posterUrl } from '../services/tmdbClient';
import { observarMatch } from '../services/repositorioMatches';
import { Message, MovieMatch, UsuarioPerfil } from '../types';
import { COLORS } from '../theme/colors';
import { SHADOWS } from '../theme/theme';
import { ChatPlusMenu } from '../components/chat/ChatPlusMenu';
import { ChatMoviePicker } from '../components/chat/ChatMoviePicker';

/**
 * 🕵️ COMPONENTE: MatchInvitation (MEMOIZADO)
 * Representa una tarjeta interactiva de 'Movie Match' dentro del flujo del chat.
 * Se suscribe a los cambios del juego (progreso de coincidencias) en tiempo real.
 */
const MatchInvitation = memo(
  ({ matchId, onEnter }: { matchId: string; onEnter: (id: string, finished: boolean) => void }) => {
    const [matchData, setMatchData] = useState<MovieMatch | null>(null);

    useEffect(() => {
      // Escuchamos el estado del juego para actualizar la barra de progreso en la invitación
      return observarMatch(matchId, setMatchData);
    }, [matchId]);

    if (!matchData) return null;

    const isFinished = matchData.status === 'finished';
    const progress = matchData.matchedMovies.length;
    const target = matchData.settings.targetMatches;

    return (
      <View
        style={[styles.matchCard, isFinished ? styles.matchCardFinished : styles.matchCardActive]}
      >
        <View style={styles.matchIconRow}>
          <Ionicons
            name={isFinished ? 'trophy' : 'flame'}
            size={24}
            color={isFinished ? '#f1c40f' : '#38bdf8'}
          />
          <Text style={[styles.matchCardTitle, isFinished && { color: '#f1c40f' }]}>
            {isFinished ? '¡MATCH COMPLETADO!' : 'MOVIE MATCH EN CURSO'}
          </Text>
        </View>

        <Text style={styles.matchCardText}>
          {isFinished
            ? `Habéis encontrado las ${target} coincidencias buscadas.`
            : `Lleváis ${progress} de ${target} películas encontradas.`}
        </Text>

        <Pressable
          onPress={() => onEnter(matchId, isFinished)}
          style={[
            styles.matchBtn,
            isFinished ? styles.matchBtnFinished : styles.matchBtnActive,
            SHADOWS.macLight,
          ]}
        >
          <Text style={[styles.matchBtnText, isFinished && { color: '#000' }]}>
            {isFinished ? 'Ver Películas Coincididas' : 'Continuar Jugando'}
          </Text>
          <Ionicons
            name={isFinished ? 'eye-outline' : 'chevron-forward'}
            size={18}
            color={isFinished ? '#000' : '#fff'}
          />
        </Pressable>
      </View>
    );
  },
);
MatchInvitation.displayName = 'MatchInvitation';

/**
 * 🚀 COMPONENTE: MessageBubble (MEMOIZADO)
 * Renderiza los diferentes tipos de mensajes: Texto, Compartición de Película o Invitación a Match.
 */
const MessageBubble = memo(
  ({
    item,
    userId,
    navigation,
    onEnterMatch,
  }: {
    item: Message;
    userId?: string;
    navigation: any;
    onEnterMatch: (id: string) => void;
  }) => {
    const isMe = item.senderId === userId;

    // ESCENARIO 1: Invitación a juego de Match
    if (item.type === 'match_invite' && item.matchId) {
      return (
        <View style={[styles.msgWrapper, styles.msgMatch]}>
          <MatchInvitation matchId={item.matchId} onEnter={onEnterMatch} />
        </View>
      );
    }

    // ESCENARIO 2: Compartición de película (Ficha visual)
    if (item.type === 'movie' && item.movieData) {
      const { movieData } = item;
      return (
        <View style={[styles.msgWrapper, isMe ? styles.msgMe : styles.msgOther]}>
          <Pressable
            style={[styles.movieShareCard, SHADOWS.macLight]}
            onPress={() => navigation.navigate('Pelicula', { movieId: movieData.id })}
          >
            <ExpoImage
              source={{ uri: posterUrl(movieData.posterPath, 'w342') ?? undefined }}
              style={styles.movieSharePoster}
              contentFit="cover"
              transition={300}
            />
            <BlurView intensity={60} tint="dark" style={styles.movieShareInfo}>
              <Text style={styles.movieShareTitle} numberOfLines={1}>
                {movieData.title}
              </Text>
              <View style={styles.movieShareFooter}>
                <Ionicons name="play-circle" size={12} color={COLORS.primary} />
                <Text style={styles.movieShareAction}>Ver detalles</Text>
              </View>
            </BlurView>
          </Pressable>
        </View>
      );
    }

    // ESCENARIO 3: Mensaje de texto básico
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgMe : styles.msgOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  },
);
MessageBubble.displayName = 'MessageBubble';

/**
 * COMPONENTE: ChatDetailScreen
 */
export function ChatDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Parámetros recibidos por la ruta
  const {
    chatId,
    chatName,
    activeMatchId: initialMatchId,
    participants: initialParticipants,
  } = route.params;

  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<string[]>(initialParticipants || []);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [editGroupName, setEditGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [texto, setTexto] = useState('');
  const [matchActivo, setMatchActivo] = useState<MovieMatch | null>(null);

  // UI de expansión del input (Menú '+' y Selector de películas)
  const [menuPlusVisible, setMenuPlusVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'vista' | 'por_ver' | 'explorar' | null>(null);
  const [amigoPerfil, setAmigoPerfil] = useState<UsuarioPerfil | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const listRef = useRef<FlatList>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // SUSCRIPCIÓN: Escuchar mensajes y metapropiedades del chat
  useEffect(() => {
    const unsub = obtenerMensajesChat(chatId, (msgs) => {
      setMensajes(msgs);
    });

    const unsubChat = observarChat(chatId, (data) => {
      setChatInfo(data);
      setParticipants(data.participants || []);
      setNewGroupName(data.name || '');
    });

    return () => {
      unsub();
      unsubChat();
    };
  }, [chatId]);

  // SUSCRIPCIÓN: Observar si hay un Movie Match activo para mostrar el acceso directo en la cabecera
  useEffect(() => {
    if (!initialMatchId) return;
    return observarMatch(initialMatchId, (m) => setMatchActivo(m));
  }, [initialMatchId]);

  /** ⚡ GESTIÓN ANIMADA DEL TECLADO:
   * Ajusta dinámicamente el scroll y el padding inferior para que el input
   * nunca quede cubierto por el teclado del SO.
   */
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
      // Scroll automático al último mensaje al abrir teclado
      setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setIsKeyboardVisible(false);
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /** Envía un mensaje de texto */
  const handleEnviar = useCallback(async () => {
    if (!texto.trim() || !user) return;
    const txt = texto.trim();
    setTexto('');
    await enviarMensaje(chatId, {
      chatId,
      senderId: user.uid,
      senderName: user.displayName || 'Usuario',
      text: txt,
      type: 'text',
    });
  }, [texto, user, chatId]);

  /** Navega directamente a la sesión activa de juego o a la configuración si no hay uno */
  const irAMatch = useCallback(() => {
    if (matchActivo && matchActivo.status === 'active') {
      navigation.navigate('MovieMatch', { matchId: matchActivo.id });
    } else {
      navigation.navigate('MatchConfig', { chatId, participants });
    }
  }, [matchActivo, navigation, chatId, participants]);

  // Lógica para obtener la foto real del amigo (si no es grupo)
  const isGroup = participants.length > 2;
  const otherUid = participants.find((id) => id !== user?.uid);

  useEffect(() => {
    if (!otherUid || isGroup) return;
    return observarUsuario(otherUid, setAmigoPerfil);
  }, [otherUid, isGroup]);

  /** Actualiza el nombre del grupo */
  const handleSaveGroupName = async () => {
    if (!newGroupName.trim()) return;
    try {
      await renombrarChat(chatId, newGroupName.trim());
      setEditGroupName(false);
    } catch (e) {
      console.error(e);
    }
  };

  /** Se dispara cuando el usuario selecciona una película para compartirla en el chat */
  const handleMovieSelect = useCallback(
    async (movie: { id: number; title: string; posterPath: string }) => {
      setPickerMode(null);
      if (!user) return;

      await enviarMensaje(chatId, {
        chatId,
        senderId: user.uid,
        senderName: user.displayName || 'Usuario',
        text: `He compartido: ${movie.title}`,
        type: 'movie',
        movieData: movie,
      });
    },
    [user, chatId],
  );

  // RESOLUCIÓN DE TÍTULOS Y AVATARES
  const otherDetails = chatInfo?.participantDetails?.[otherUid || ''];
  const displayTitle = isGroup
    ? chatInfo?.name || `Grupo de ${participants.length} personas`
    : amigoPerfil?.username || otherDetails?.username || chatName || 'Chat';

  const displayAvatar = isGroup
    ? chatInfo?.groupIcon
    : amigoPerfil?.fotoPerfil || otherDetails?.fotoPerfil;

  return (
    <View style={styles.container}>
      {/* 🔮 CABECERA GLASEADA */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            paddingBottom: 15,
            backgroundColor: 'rgba(15, 23, 42, 0.12)',
          },
        ]}
      >
        <BlurView
          intensity={80}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <Pressable
            style={styles.headerInfo}
            onPress={() => isGroup && setEditGroupName(true)}
            disabled={!isGroup}
          >
            <View style={styles.avatarMini}>
              {displayAvatar ? (
                <ExpoImage
                  source={{ uri: displayAvatar }}
                  style={styles.avatarImgMini}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Ionicons
                  name={isGroup ? 'people' : 'person'}
                  size={18}
                  color="rgba(255,255,255,0.4)"
                />
              )}
            </View>
            <View>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {displayTitle}
              </Text>
              {isGroup && <Text style={styles.groupEditHint}>Toca para editar nombre</Text>}
            </View>
          </Pressable>

          {/* BOTÓN DE ACCESO AL MOVIE MATCH */}
          <Pressable
            onPress={irAMatch}
            style={[styles.matchActionBtn, matchActivo && styles.matchActionBtnOn]}
          >
            <Ionicons name="flame" size={20} color={matchActivo ? '#020617' : '#69DFD9'} />
            {matchActivo && (
              <Text style={styles.matchCounter}>{matchActivo.matchedMovies.length}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <Animated.View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <View style={styles.webCenteringWrapper}>
          <FlatList
            ref={listRef}
            data={useMemo(() => [...mensajes].reverse(), [mensajes])}
            inverted // Empezamos desde abajo (último mensaje)
            keyExtractor={(item) => item.id}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 0,
              paddingBottom: insets.top + 100,
            }}
            renderItem={({ item }) => (
              <MessageBubble
                item={item}
                userId={user?.uid}
                navigation={navigation}
                onEnterMatch={(id) => navigation.navigate('MovieMatch', { matchId: id })}
              />
            )}
            style={styles.chatList}
          />
        </View>

        {/* INPUT DE MENSAJE TIPO WHATSAPP/IMESSAGE */}
        <BlurView
          intensity={80}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={[
            styles.inputWrapper,
            {
              paddingBottom: isKeyboardVisible
                ? 12
                : Math.max(insets.bottom, Platform.OS === 'web' ? 44 : 22),
            },
          ]}
        >
          <View style={styles.inputCenteringWrapper}>
            <View style={styles.inputRow}>
              {/* BOTÓN PLUS: Expande el menú de películas */}
              <Pressable
                style={styles.plusBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setMenuPlusVisible(!menuPlusVisible);
                }}
              >
                <Ionicons
                  name={menuPlusVisible ? 'close' : 'add'}
                  size={26}
                  color={menuPlusVisible ? COLORS.primary : 'rgba(255,255,255,0.4)'}
                />
              </Pressable>

              <TextInput
                value={texto}
                onChangeText={setTexto}
                placeholder="Escribe algo..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.input}
                multiline
              />

              <Pressable onPress={handleEnviar} style={styles.sendBtn} disabled={!texto.trim()}>
                <Ionicons name="arrow-up" size={22} color="#000" />
              </Pressable>
            </View>
          </View>
        </BlurView>

        {/* --- MODALIDADES DE COMPARTICIÓN (COMPOSICIÓN) --- */}
        <ChatPlusMenu
          visible={menuPlusVisible}
          onSelect={(mode) => {
            setMenuPlusVisible(false);
            setPickerMode(mode);
          }}
          fontFamily="System"
        />
        <ChatMoviePicker
          visible={!!pickerMode}
          mode={pickerMode}
          onClose={() => setPickerMode(null)}
          onSelect={handleMovieSelect}
          fontFamily="System"
        />
      </Animated.View>

      {/* Modal para editar el nombre del grupo (Solo para chats grupales) */}
      <Modal visible={editGroupName} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <BlurView
            intensity={60}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.modalCardFlotante, SHADOWS.mac]}>
            <Text style={styles.modalTitle}>Nombre del Grupo</Text>
            <TextInput
              style={styles.modalInputGlass}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Escribe un nombre..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditGroupName(false)} style={styles.modalBtnCancel}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSaveGroupName} style={styles.modalBtnSave}>
                <Text style={styles.modalBtnText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  webCenteringWrapper: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    flex: 1,
  },
  inputCenteringWrapper: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  chatList: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  backBtn: { padding: 8, marginRight: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImgMini: { width: 34, height: 34, borderRadius: 17 },
  chatTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  groupEditHint: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 },
  matchActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(105,223,217,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchActionBtnOn: { backgroundColor: '#69DFD9' },
  matchCounter: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    borderRadius: 10,
    color: '#69DFD9',
    fontSize: 11,
    fontWeight: '900',
    ...SHADOWS.macLight,
  },
  msgWrapper: { marginBottom: 16, maxWidth: '80%' },
  msgMe: { alignSelf: 'flex-end' },
  msgOther: { alignSelf: 'flex-start' },
  bubble: { padding: 12, borderRadius: 20 },
  bubbleMe: { backgroundColor: '#007AFF' },
  bubbleOther: { backgroundColor: 'rgba(255,255,255,0.1)' },
  msgText: { color: '#fff', fontSize: 16 },
  flex: { flex: 1 },
  inputWrapper: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  plusBtn: { marginRight: 12 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // Estilos de la Invitación de Match
  msgMatch: { alignSelf: 'center', width: '90%', marginVertical: 10 },
  matchCard: { padding: 20, borderRadius: 24, borderWidth: 1 },
  matchCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  matchCardFinished: {
    backgroundColor: 'rgba(241, 196, 15, 0.05)',
    borderColor: 'rgba(241, 196, 15, 0.2)',
  },
  matchIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  matchCardTitle: { color: '#38bdf8', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  matchCardText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 },
  matchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
  },
  matchBtnActive: { backgroundColor: '#38bdf8' },
  matchBtnFinished: { backgroundColor: '#f1c40f' },
  matchBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Compartir películas
  movieShareCard: {
    width: 200,
    height: 300,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  movieSharePoster: {
    flex: 1,
    width: '100%',
  },
  movieShareInfo: {
    padding: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  movieShareTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  movieShareFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  movieShareAction: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal de edición de grupo
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCardFlotante: {
    width: '100%',
    backgroundColor: 'rgba(23, 23, 40, 0.9)',
    borderRadius: 32,
    padding: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalInputGlass: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalBtnSave: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  modalBtnText: { color: '#fff', fontWeight: '800' },
});
