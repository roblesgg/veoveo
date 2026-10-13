/**
 * ARCHIVO: screens/SocialTab.tsx
 * DESCRIPCIÓN: Pestaña 'Social'. Gestiona la lista de conversaciones (Chats),
 * la lista de amigos y el buscador global de usuarios.
 * Incluye funcionalidades de creación de chats grupales y gestión de solicitudes.
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Keyboard,
  Modal,
  Platform,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ConfirmModal } from '../components/common/ConfirmModal';

// Hooks & Services
import { useSocialData } from '../hooks/social/useSocialData';
import { observarMisChats, crearChat, borrarChat } from '../services/repositorioChats';
import { Chat, UsuarioPerfil } from '../types';
import { useAuth } from '../context/AuthContext';

// Components
import { FriendRow } from '../components/social/FriendRow';
import { UserSearchRow } from '../components/social/UserSearchRow';
import { SolicitudesBadge } from '../components/social/SolicitudesBadge';
import { COLORS, CardSurface } from '../theme/colors';
import { SHADOWS } from '../theme/theme';

type Props = {
  fontFamily: string;
  onUsuarioClick: (uid: string) => void;
  onSolicitudesClick: () => void;
  onChatClick: (chatId: string, participants: string[], chatName?: string) => void;
  onPerfilClick?: () => void;
  userFoto?: string | null;
};

/**
 * 🚀 [MEMO] Fila de Chat individual para la lista.
 * Se encarga de inferir el nombre del chat (si es un amigo directo o un grupo)
 * y mostrar indicadores de 'Movie Match' activo.
 */
const SocialChatRow = memo(
  ({
    chat,
    user,
    amigos,
    onChatClick,
    onBorrarRef,
  }: {
    chat: Chat;
    user: any;
    amigos: UsuarioPerfil[];
    onChatClick: any;
    onBorrarRef: (id: string) => void;
  }) => {
    const otherUid = chat.participants.find((id) => id !== user?.uid);
    const amigoDetalle = amigos.find((a) => a.uid === otherUid);

    // Decidimos el título: Nombre del grupo > Nombre del amigo > User del perfil cacheado
    const chatTitle =
      chat.name ||
      amigoDetalle?.username ||
      chat.participantDetails?.[otherUid || '']?.username ||
      'Chat...';
    const avatarUri =
      amigoDetalle?.fotoPerfil || chat.participantDetails?.[otherUid || '']?.fotoPerfil || null;

    return (
      <Pressable
        style={[styles.chatRow, SHADOWS.macLight]}
        onPress={() => onChatClick(chat.id, chat.participants, chatTitle)}
      >
        <View style={styles.chatAvatar}>
          {avatarUri && avatarUri.trim() !== '' ? (
            <ExpoImage
              source={{ uri: avatarUri }}
              style={styles.fullImg}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Ionicons
              name={chat.type === 'group' ? 'people' : 'person'}
              size={24}
              color="rgba(255,255,255,0.4)"
            />
          )}
          {/* PUNTO NARANJA: Indica que hay un juego de Match activo en este chat */}
          {chat.activeMatchId && <View style={styles.matchDot} />}
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{chatTitle}</Text>
          <Text style={styles.chatLastMsg} numberOfLines={1}>
            {chat.lastMessage?.text || 'Sin mensajes aún'}
          </Text>
        </View>
        {chat.activeMatchId && (
          <View style={styles.matchBadgeMini}>
            <Ionicons name="flame" size={12} color="#ff6b00" />
            <Text style={styles.matchBadgeText}>Match</Text>
          </View>
        )}
        <Pressable onPress={() => onBorrarRef(chat.id)} hitSlop={8} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
        </Pressable>
      </Pressable>
    );
  },
);
SocialChatRow.displayName = 'SocialChatRow';

/**
 * COMPONENTE: SocialTab
 */
export function SocialTab({
  fontFamily,
  onUsuarioClick,
  onSolicitudesClick,
  onChatClick,
  onPerfilClick,
  userFoto,
}: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // ESTADOS DE UI
  const [tab, setTab] = useState<0 | 1 | 2>(0); // 0: Chats, 1: Amigos, 2: Buscar
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [socialSearch, setSocialSearch] = useState('');
  const [buscarAtivaSocial, setBuscarAtivaSocial] = useState(false);
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [amigosSeleccionados, setAmigosSeleccionados] = useState<string[]>([]);

  // HOOK: Lógica social (amigos, búsquedas, solicitudes)
  const {
    amigos,
    resultados,
    solPendientesCount,
    solEnviadas,
    busqueda,
    setBusqueda,
    cargando,
    handleSendSolicitud,
    handleEliminarAmigo,
    recargar,
  } = useSocialData();

  // Refresca el contador de solicitudes al volver a esta pestaña
  useFocusEffect(
    React.useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  // EFECTO: Escuchar cambios en los chats del usuario en tiempo real
  useEffect(() => {
    if (!user) return;
    return observarMisChats(user.uid, (data) => {
      setChats(data);
      setLoadingChats(false);
    });
  }, [user]);

  /** Filtrado local para la lista de chats */
  const chatsFiltrados = React.useMemo(() => {
    const q = socialSearch.toLowerCase().trim();
    if (!q || tab !== 0) return chats;
    return chats.filter((chat) => {
      const otherUid = chat.participants.find((id) => id !== user?.uid);
      const amigoDetalle = amigos.find((a) => a.uid === otherUid);
      const chatTitle = (
        chat.name ||
        amigoDetalle?.username ||
        chat.participantDetails?.[otherUid || '']?.username ||
        ''
      ).toLowerCase();
      return chatTitle.includes(q);
    });
  }, [chats, socialSearch, tab, user, amigos]);

  /** Filtrado local para la lista de amigos */
  const amigosFiltrados = React.useMemo(() => {
    const q = socialSearch.toLowerCase().trim();
    if (!q || tab !== 1) return amigos;
    return amigos.filter((a) => a.username.toLowerCase().includes(q));
  }, [amigos, socialSearch, tab]);

  /** Activa o resetea la búsqueda en la pestaña actual */
  const toggleSearch = () => {
    if (socialSearch !== '') {
      setSocialSearch('');
      Keyboard.dismiss();
    } else {
      setBuscarAtivaSocial(!buscarAtivaSocial);
    }
  };

  /** Inicia un chat con uno o varios amigos (Individual o Grupal) */
  const handleCrearChatMultiple = async () => {
    if (!user || amigosSeleccionados.length === 0) return;
    try {
      const allParticipants = [user.uid, ...amigosSeleccionados];
      const type = allParticipants.length > 2 ? 'group' : 'individual';
      const chatId = await crearChat(allParticipants, type);
      setMostrarSelector(false);
      setAmigosSeleccionados([]);
      onChatClick(chatId, allParticipants, type === 'group' ? 'Nueva conversación' : undefined);
    } catch (e) {
      console.error(e);
    }
  };

  const [chatABorrar, setChatABorrar] = useState<string | null>(null);

  const handleBorrarChatAction = async () => {
    if (!chatABorrar) return;
    try {
      await borrarChat(chatABorrar);
      setChatABorrar(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Resetea búsqueda al cambiar de solapa
  const handleSetTab = (newTab: 0 | 1 | 2) => {
    setTab(newTab);
    Keyboard.dismiss();
    setSocialSearch('');
    setBuscarAtivaSocial(false);
  };

  // Callbacks estabilizados para optimizar componentes memoizados hijos
  const stabilizedOnChatClick = useCallback(onChatClick, [onChatClick]);
  const stabilizedSetChatABorrar = useCallback((id: string) => setChatABorrar(id), []);

  // Gestión de botón atrás para navegación intuitiva entre pestañas
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (buscarAtivaSocial) {
          setBuscarAtivaSocial(false);
          setSocialSearch('');
          return true;
        }
        if (tab !== 0) {
          setTab(0);
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [tab, buscarAtivaSocial]),
  );

  return (
    <View style={styles.flex}>
      {/* 🔮 CABECERA GLASEADA */}
      <BlurView
        intensity={85}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.headerContainer, { height: insets.top + (buscarAtivaSocial ? 160 : 80) }]}
      />
      <View
        style={[
          styles.headerContainer,
          {
            height: insets.top + (buscarAtivaSocial ? 160 : 80),
            backgroundColor: 'rgba(15, 23, 42, 0.12)',
          },
        ]}
      >
        <View style={styles.headerBorder} />
        <View style={[styles.headerRow, { top: Math.max(insets.top, 12) + 12 }]}>
          <Text style={[styles.titulo, { fontFamily, flex: 1 }]}>Social</Text>
          <View style={styles.actionsTopRow}>
            {tab !== 2 && (
              <Pressable onPress={toggleSearch} style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="search-outline" size={28} color="#fff" />
              </Pressable>
            )}
            <Pressable onPress={() => onPerfilClick?.()} style={styles.perfilBtnMini} hitSlop={8}>
              <View style={styles.perfilInnerMini}>
                {userFoto && userFoto.trim() !== '' ? (
                  <ExpoImage
                    source={{ uri: userFoto }}
                    style={styles.perfilFotoMini}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <Ionicons name="person" size={22} color="#fff" />
                )}
              </View>
            </Pressable>
          </View>
        </View>

        {/* INPUT DE BÚSQUEDA / FILTRO */}
        {buscarAtivaSocial && tab !== 2 && (
          <View
            style={[styles.searchField, SHADOWS.macLight, { top: Math.max(insets.top, 12) + 80 }]}
          >
            <TextInput
              value={socialSearch}
              onChangeText={setSocialSearch}
              placeholder={tab === 0 ? 'Buscar chats...' : 'Filtrar amigos...'}
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={{ flex: 1, color: '#fff', fontFamily }}
              autoFocus
            />
            {socialSearch.trim().length > 0 && (
              <Pressable onPress={() => setSocialSearch('')} style={{ paddingLeft: 8 }}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={[styles.content, { paddingTop: insets.top + (buscarAtivaSocial ? 170 : 90) }]}>
        {/* BADGE DE SOLICITUDES: Solo visible si hay peticiones de amistad pendientes */}
        <SolicitudesBadge
          count={solPendientesCount}
          onPress={onSolicitudesClick}
          fontFamily={fontFamily}
        />

        {/* SELECTOR DE SUB-PESTAÑAS (CHATS / AMIGOS / BUSCAR) */}
        <View style={styles.tabContainer}>
          <View style={styles.tabCenteringWrapper}>
            <View style={[styles.tabWrapper, SHADOWS.macLight]}>
              <Pressable
                onPress={() => handleSetTab(0)}
                style={[styles.tabBtn, tab === 0 && styles.tabOnBtn]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.tabText, tab === 0 && styles.tabOnText, { fontFamily }]}
                >
                  Chats
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleSetTab(1)}
                style={[styles.tabBtn, tab === 1 && styles.tabOnBtn]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.tabText, tab === 1 && styles.tabOnText, { fontFamily }]}
                >
                  Amigos
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleSetTab(2)}
                style={[styles.tabBtn, tab === 2 && styles.tabOnBtn]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.tabText, tab === 2 && styles.tabOnText, { fontFamily }]}
                >
                  Buscar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.webCenteringWrapper}>
          {tab === 0 && (
            /* LISTADO DE CONVERSACIONES (Virtualizado para rendimiento) */
            <FlatList
              data={chatsFiltrados}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              ListHeaderComponent={() => (
                <Pressable
                  onPress={() => setMostrarSelector(true)}
                  style={[styles.newChatCard, SHADOWS.macLight, { marginBottom: 12 }]}
                >
                  <View style={styles.newChatCircle}>
                    <Ionicons name="add" size={26} color={COLORS.primary} />
                  </View>
                  <Text style={[styles.newChatText, { fontFamily }]}>
                    Iniciar nueva conversación
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={() =>
                loadingChats ? (
                  <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
                ) : (
                  <Text style={styles.emptyText}>
                    {socialSearch ? 'No se encontraron chats' : 'No tienes conversaciones activas'}
                  </Text>
                )
              }
              renderItem={({ item }) => (
                <SocialChatRow
                  chat={item}
                  user={user}
                  amigos={amigos}
                  onChatClick={stabilizedOnChatClick}
                  onBorrarRef={stabilizedSetChatABorrar}
                />
              )}
            />
          )}

          {tab !== 0 && (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* LISTA DE AMIGOS CONSOLIDADOS */}
              {tab === 1 && (
                <View>
                  {amigosFiltrados.map((a) => (
                    <FriendRow
                      key={a.uid}
                      amigo={a}
                      onPress={() => onUsuarioClick(a.uid)}
                      fontFamily={fontFamily}
                    />
                  ))}
                  {amigosFiltrados.length === 0 && socialSearch && (
                    <Text style={styles.emptyText}>No se encontraron amigos</Text>
                  )}
                </View>
              )}

              {/* BUSCADOR GLOBAL DE USUARIOS EN LA PLATAFORMA */}
              {tab === 2 && (
                <View>
                  <TextInput
                    value={busqueda}
                    onChangeText={setBusqueda}
                    placeholder="Buscar personas en VeoVeo..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={styles.searchInput}
                  />
                  {resultados.map((u) => (
                    <UserSearchRow
                      key={u.uid}
                      usuario={{ ...u, fotoPerfil: u.fotoPerfil || undefined }}
                      enviada={solEnviadas.has(u.uid)}
                      onAdd={() => handleSendSolicitud(u.uid, u.username)}
                      fontFamily={fontFamily}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* MODAL: Selector de amigos para nuevo chat grupal */}
      <Modal visible={mostrarSelector} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, SHADOWS.mac]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily }]}>Nueva conversación</Text>
              <Pressable
                onPress={() => {
                  setMostrarSelector(false);
                  setAmigosSeleccionados([]);
                }}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { fontFamily }]}>
              Selecciona uno o varios amigos
            </Text>

            <ScrollView style={styles.amigosSelector}>
              {amigos.length === 0 ? (
                <Text style={styles.emptyText}>No tienes amigos agregados</Text>
              ) : (
                amigos.map((a) => {
                  const selected = amigosSeleccionados.includes(a.uid);
                  return (
                    <Pressable
                      key={a.uid}
                      style={[styles.selectorRow, selected && styles.selectorRowOn]}
                      onPress={() => {
                        setAmigosSeleccionados((prev) =>
                          selected ? prev.filter((id) => id !== a.uid) : [...prev, a.uid],
                        );
                      }}
                    >
                      <View style={styles.selectorAvatar}>
                        {a.fotoPerfil ? (
                          <Image source={{ uri: a.fotoPerfil }} style={styles.fullImg} />
                        ) : (
                          <Ionicons name="person" size={20} color="#fff" />
                        )}
                      </View>
                      <Text style={[styles.selectorName, { fontFamily }]}>{a.username}</Text>
                      <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                        {selected && <Ionicons name="checkmark" size={14} color="#000" />}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <Pressable
              onPress={handleCrearChatMultiple}
              disabled={amigosSeleccionados.length === 0}
              style={[styles.btnAceptar, amigosSeleccionados.length === 0 && { opacity: 0.4 }]}
            >
              <Text style={[styles.btnAceptarText, { fontFamily }]}>
                Aceptar ({amigosSeleccionados.length})
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* CONFIRMACIÓN: Para borrar chats */}
      <ConfirmModal
        visible={!!chatABorrar}
        onClose={() => setChatABorrar(null)}
        onConfirm={handleBorrarChatAction}
        title="Borrar Chat"
        message="¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer."
        confirmText="Borrar"
        cancelText="Cancelar"
        iconName="trash"
        fontFamily={fontFamily}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#020617' },
  webCenteringWrapper: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    flex: 1,
  },
  tabCenteringWrapper: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  titulo: { color: '#fff', fontSize: 32, fontWeight: '800' },
  headerRow: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsTopRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  perfilBtnMini: { marginLeft: 4 },
  perfilInnerMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  perfilFotoMini: { width: 44, height: 44, borderRadius: 22 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2000 },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: { flex: 1 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchField: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tabContainer: { paddingHorizontal: 20, marginTop: 10, marginBottom: 20 },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 6,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOnBtn: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
  tabOnText: { color: '#fff', fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingBottom: 140 },
  chatRow: {
    flexDirection: 'row',
    backgroundColor: CardSurface,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginTop: 10,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  matchDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ff6b00',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  chatInfo: { flex: 1 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  chatLastMsg: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  matchBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  matchBadgeText: { color: '#ff6b00', fontSize: 10, fontWeight: '800' },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    color: '#fff',
    marginBottom: 16,
  },
  emptyText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40 },
  newChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    marginBottom: 4,
  },
  newChatCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  newChatText: { color: '#38bdf8', fontSize: 16, fontWeight: '700' },
  fullImg: { width: 50, height: 50, borderRadius: 25 },
  deleteBtn: { padding: 8, marginLeft: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  modalSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 20 },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amigosSelector: { flex: 1 },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  selectorRowOn: { backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  selectorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectorName: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  btnAceptar: {
    backgroundColor: '#38bdf8',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  btnAceptarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
