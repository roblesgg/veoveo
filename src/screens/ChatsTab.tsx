/**
 * ARCHIVO: screens/ChatsTab.tsx
 * DESCRIPCIÓN: Pestaña Chats (3.0). Lista de chats 1:1 y grupos ordenada por el último mensaje,
 * con no leídos, silenciados y Movie Match en curso. Pulsación larga: silenciar o borrar para mí.
 */
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { IconBell, IconBellOff, IconCards, IconEdit, IconTrash } from '@tabler/icons-react-native';
import { useChats } from '../context/ChatsContext';
import { useAuth } from '../context/AuthContext';
import { nombreDe, usePerfiles } from '../hooks/usePerfiles';
import { contarNoLeidos, ocultarChat, silenciarChat } from '../services/repositorioChats';
import { Avatar } from '../components/common/Avatar';
import { BotonPrincipal } from '../components/common/Botones';
import { CampoBusqueda } from '../components/common/Campos';
import { Esqueleto } from '../components/common/Esqueleto';
import { HojaAcciones } from '../components/common/HojaAcciones';
import { IconoPalomitas } from '../components/iconos/IconosPropios';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';
import { formatearMomentoChat } from '../utils/fechas';
import type { Chat, EstadoChatPropio, UsuarioPerfil } from '../types';

type Props = {
  onAbrirChat: (chatId: string) => void;
  onNuevoChat: () => void;
  onPerfilClick: () => void;
  userFoto?: string | null;
};

/** Título y avatar de un chat: el nombre del grupo o el del otro participante. */
export function presentacionChat(
  chat: Chat,
  yo: string,
  perfiles: Record<string, UsuarioPerfil | undefined>,
) {
  if (chat.type === 'group') {
    return { titulo: chat.name || 'Grupo', emoji: chat.emoji ?? '🍿', foto: null, otro: null };
  }
  const otroUid = chat.participants.find((p) => p !== yo) ?? yo;
  const otro = perfiles[otroUid];
  return { titulo: nombreDe(otro, !otro), emoji: null, foto: otro?.fotoPerfil ?? null, otro };
}

export function ChatsTab({ onAbrirChat, onNuevoChat, onPerfilClick, userFoto }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const yo = user?.uid ?? '';
  const { chats, estado, cargando, error, conNoLeidos } = useChats();
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<Chat | null>(null);

  const otros = useMemo(
    () =>
      chats.flatMap((c) => (c.type === 'individual' ? c.participants.filter((p) => p !== yo) : [])),
    [chats, yo],
  );
  const remitentes = useMemo(
    () => chats.map((c) => c.lastMessage?.senderId).filter(Boolean) as string[],
    [chats],
  );
  const perfiles = usePerfiles([...otros, ...remitentes]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => presentacionChat(c, yo, perfiles).titulo.toLowerCase().includes(q));
  }, [busqueda, chats, perfiles, yo]);

  const silenciado = seleccionado ? Boolean(estado[seleccionado.id]?.silenciado) : false;

  return (
    <View style={styles.flex}>
      <View style={[styles.cabecera, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.titulo}>Chats</Text>
        <Pressable
          onPress={onNuevoChat}
          style={styles.icono}
          hitSlop={8}
          accessibilityLabel="Nuevo chat"
        >
          <IconEdit size={24} color={COLORS.text} strokeWidth={2} />
        </Pressable>
        <Pressable onPress={onPerfilClick} hitSlop={8} accessibilityLabel="Tu perfil">
          <Avatar uri={userFoto} nombre={user?.displayName} tamano={40} />
        </Pressable>
      </View>

      <CampoBusqueda
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar chats"
        estilo={styles.buscador}
      />

      {cargando ? (
        <View style={{ paddingHorizontal: 20, gap: 18, marginTop: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Esqueleto ancho={52} alto={52} radio={26} />
              <View style={{ flex: 1, gap: 8 }}>
                <Esqueleto ancho="50%" alto={14} radio={7} />
                <Esqueleto ancho="80%" alto={12} radio={6} />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioTitulo}>No hemos podido cargar tus chats</Text>
          <Text style={styles.vacioTexto}>Revisa la conexión. Se cargarán solos al volver.</Text>
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.vacio}>
          <IconoPalomitas size={64} />
          <Text style={styles.vacioTitulo}>Aún no tienes chats</Text>
          <Text style={styles.vacioTexto}>Escribe a un amigo y elegid peli juntos.</Text>
          <BotonPrincipal texto="Nuevo chat" onPress={onNuevoChat} estilo={styles.boton} />
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <FilaChat
              chat={item}
              yo={yo}
              perfiles={perfiles}
              estado={estado[item.id]}
              noLeido={conNoLeidos(item)}
              onPress={() => onAbrirChat(item.id)}
              onLongPress={() => setSeleccionado(item)}
            />
          )}
        />
      )}

      <HojaAcciones
        visible={Boolean(seleccionado)}
        onCerrar={() => setSeleccionado(null)}
        acciones={
          seleccionado
            ? [
                {
                  texto: silenciado ? 'Quitar silencio' : 'Silenciar',
                  icono: (c) =>
                    silenciado ? (
                      <IconBell size={22} color={c} />
                    ) : (
                      <IconBellOff size={22} color={c} />
                    ),
                  onPress: () => void silenciarChat(seleccionado.id, !silenciado),
                },
                {
                  texto: 'Borrar chat para mí',
                  icono: (c) => <IconTrash size={22} color={c} />,
                  onPress: () => void ocultarChat(seleccionado.id),
                  peligro: true,
                },
              ]
            : []
        }
      />
    </View>
  );
}

const FilaChat = memo(function FilaChat({
  chat,
  yo,
  perfiles,
  estado,
  noLeido,
  onPress,
  onLongPress,
}: {
  chat: Chat;
  yo: string;
  perfiles: Record<string, UsuarioPerfil | undefined>;
  estado: EstadoChatPropio | undefined;
  noLeido: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { titulo, emoji, foto } = presentacionChat(chat, yo, perfiles);
  const ultimo = chat.lastMessage;
  const { data: cuantos } = useQuery({
    queryKey: ['no-leidos', chat.id, ultimo?.timestamp, estado?.ultimaLectura],
    queryFn: () => contarNoLeidos(chat.id, estado?.ultimaLectura ?? 0),
    enabled: noLeido,
    staleTime: Infinity,
  });

  let vistaPrevia = 'Sin mensajes todavía';
  if (ultimo) {
    const autor =
      ultimo.senderId === yo
        ? 'Tú: '
        : chat.type === 'group'
          ? `${nombreDe(perfiles[ultimo.senderId])}: `
          : '';
    vistaPrevia = ultimo.eliminado ? 'Mensaje eliminado' : `${autor}${ultimo.text}`;
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.fila,
        pressed && { backgroundColor: 'rgba(255,255,255,0.04)' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}${noLeido ? ', mensajes sin leer' : ''}`}
    >
      {emoji ? (
        <View style={styles.emoji}>
          <Text style={{ fontSize: 26 }}>{emoji}</Text>
        </View>
      ) : (
        <Avatar uri={foto} nombre={titulo} tamano={52} />
      )}
      <View style={styles.cuerpo}>
        <View style={styles.lineaTitulo}>
          <Text style={styles.nombre} numberOfLines={1}>
            {titulo}
          </Text>
          {estado?.silenciado && <IconBellOff size={15} color={COLORS.textMuted} strokeWidth={2} />}
        </View>
        <Text
          style={[
            styles.previa,
            ultimo?.eliminado && { fontStyle: 'italic' },
            noLeido && { color: COLORS.text },
          ]}
          numberOfLines={1}
        >
          {vistaPrevia}
        </Text>
        {chat.activeMatchId ? (
          <View style={styles.pastillaMatch}>
            <IconCards size={12} color={COLORS.accent} strokeWidth={2} />
            <Text style={styles.pastillaTexto}>Match en curso</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.lado}>
        <Text style={[styles.momento, noLeido && { color: COLORS.primary }]}>
          {ultimo ? formatearMomentoChat(ultimo.timestamp) : ''}
        </Text>
        {noLeido && (
          <View style={styles.contador}>
            <Text style={styles.contadorTexto}>
              {cuantos && cuantos > 99 ? '99+' : (cuantos ?? 1)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  icono: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  buscador: { marginHorizontal: 20, marginBottom: 8 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emoji: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(105,223,217,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(105,223,217,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: { flex: 1, minWidth: 0 },
  lineaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { color: COLORS.text, fontSize: 16, fontFamily: FUENTES.titulo, flexShrink: 1 },
  previa: { color: COLORS.textMuted, fontSize: 14, fontFamily: FUENTES.texto, marginTop: 2 },
  pastillaMatch: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(105,223,217,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(105,223,217,0.3)',
  },
  pastillaTexto: { color: COLORS.accent, fontSize: 11, fontFamily: FUENTES.titulo },
  lado: { alignItems: 'flex-end', gap: 6 },
  momento: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto },
  contador: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { color: COLORS.onAccent, fontSize: 11, fontFamily: FUENTES.titulo },
  vacio: { alignItems: 'center', paddingHorizontal: 36, paddingTop: 56, gap: 12 },
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
