/**
 * ARCHIVO: screens/InfoGrupoScreen.tsx
 * DESCRIPCIÓN: Información de un grupo: emoji y nombre (administradores), silenciar, miembros
 * (añadir amigos, quitar, hacer administrador) y salir del grupo.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconBellOff,
  IconCheck,
  IconChevronLeft,
  IconDots,
  IconFlag,
  IconLogout,
  IconPencil,
  IconShieldCheck,
  IconUserMinus,
  IconUserPlus,
} from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { useChats } from '../context/ChatsContext';
import { nombreDe, usePerfiles } from '../hooks/usePerfiles';
import { useSocialData } from '../hooks/social/useSocialData';
import {
  anadirMiembros,
  cambiarEmojiGrupo,
  enviarMensaje,
  hacerAdmin,
  observarChat,
  quitarMiembro,
  renombrarChat,
  salirDelGrupo,
  silenciarChat,
} from '../services/repositorioChats';
import { Avatar } from '../components/common/Avatar';
import { HojaAcciones } from '../components/common/HojaAcciones';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { HojaDenuncia } from '../components/common/HojaDenuncia';
import type { ObjetoDenuncia } from '../services/repositorioDenuncias';
import { SelectorEmoji } from '../components/chat/SelectorEmoji';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';
import type { Chat } from '../types';

export function InfoGrupoScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const yo = user?.uid ?? '';
  const { chatId } = route.params as { chatId: string };
  const { estado } = useChats();
  const { amigos } = useSocialData();

  const [chat, setChat] = useState<Chat | null | undefined>(undefined);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombre, setNombre] = useState('');
  const [miembroSel, setMiembroSel] = useState<string | null>(null);
  const [anadiendo, setAnadiendo] = useState(false);
  const [nuevos, setNuevos] = useState<string[]>([]);
  const [confirmarSalir, setConfirmarSalir] = useState(false);
  const [denuncia, setDenuncia] = useState<ObjetoDenuncia | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => observarChat(chatId, setChat), [chatId]);
  const perfiles = usePerfiles([...(chat?.participants ?? []), yo]);
  const soyAdmin = Boolean(chat?.admins?.includes(yo));
  const silenciado = Boolean(estado[chatId]?.silenciado);
  const amigosFuera = useMemo(
    () => amigos.filter((a) => !chat?.participants.includes(a.uid)),
    [amigos, chat],
  );

  if (chat === undefined) {
    return (
      <View style={[styles.flex, styles.centro]}>
        <LoaderClaqueta />
      </View>
    );
  }
  if (!chat || !chat.participants.includes(yo)) {
    return (
      <View style={[styles.flex, styles.centro, { padding: 32 }]}>
        <Text style={styles.texto}>Ya no estás en este grupo.</Text>
      </View>
    );
  }

  const conError = async (accion: () => Promise<unknown>, mensaje: string) => {
    setError(null);
    try {
      await accion();
    } catch {
      setError(mensaje);
    }
  };
  const avisarEnElChat = (texto: string) =>
    enviarMensaje(chat, { type: 'sistema', text: texto }, nombreDe(perfiles[yo], true)).catch(
      () => undefined,
    );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecera}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Volver">
          <IconChevronLeft size={28} color={COLORS.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.cabeceraTitulo}>Grupo</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.portada}>
          {soyAdmin ? (
            <SelectorEmoji
              valor={chat.emoji ?? '🍿'}
              onCambio={(e) =>
                void conError(
                  () => cambiarEmojiGrupo(chat.id, e),
                  'No hemos podido cambiar el emoji.',
                )
              }
              tamano={96}
            />
          ) : (
            <View style={styles.emojiGrande}>
              <Text style={{ fontSize: 46 }}>{chat.emoji ?? '🍿'}</Text>
            </View>
          )}
          {editandoNombre ? (
            <View style={styles.filaNombre}>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                style={styles.campoNombre}
                autoFocus
                maxLength={40}
              />
              <Pressable
                onPress={() => {
                  setEditandoNombre(false);
                  if (nombre.trim() && nombre.trim() !== chat.name) {
                    void conError(async () => {
                      await renombrarChat(chat.id, nombre);
                      await avisarEnElChat(
                        `${nombreDe(perfiles[yo], true)} ha cambiado el nombre a «${nombre.trim()}»`,
                      );
                    }, 'No hemos podido cambiar el nombre.');
                  }
                }}
                accessibilityLabel="Guardar nombre"
              >
                <IconCheck size={26} color={COLORS.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.filaNombre}
              disabled={!soyAdmin}
              onPress={() => {
                setNombre(chat.name ?? '');
                setEditandoNombre(true);
              }}
            >
              <Text style={styles.nombreGrupo}>{chat.name || 'Grupo'}</Text>
              {soyAdmin && <IconPencil size={18} color={COLORS.textMuted} strokeWidth={2} />}
            </Pressable>
          )}
          <Text style={styles.texto}>{chat.participants.length} miembros</Text>
        </View>

        <View style={styles.tarjeta}>
          <View style={styles.ajuste}>
            <IconBellOff size={22} color={COLORS.textMuted} strokeWidth={2} />
            <Text style={styles.ajusteTexto}>Silenciar</Text>
            <Switch
              value={silenciado}
              onValueChange={(v) =>
                void conError(() => silenciarChat(chat.id, v), 'No hemos podido cambiarlo.')
              }
              trackColor={{ true: COLORS.primary, false: 'rgba(255,255,255,0.15)' }}
              thumbColor="#F8FAFC"
            />
          </View>
        </View>

        <Text style={styles.seccion}>Miembros</Text>
        <View style={styles.tarjeta}>
          {soyAdmin && (
            <Pressable style={styles.ajuste} onPress={() => setAnadiendo(true)}>
              <IconUserPlus size={22} color={COLORS.primary} strokeWidth={2} />
              <Text style={[styles.ajusteTexto, { color: COLORS.primary }]}>Añadir amigos</Text>
            </Pressable>
          )}
          {chat.participants.map((uid) => {
            const p = perfiles[uid];
            const esAdmin = chat.admins?.includes(uid);
            return (
              <Pressable
                key={uid}
                style={styles.ajuste}
                disabled={uid === yo}
                onPress={() => setMiembroSel(uid)}
              >
                <Avatar uri={p?.fotoPerfil} nombre={p?.username} tamano={40} />
                <Text style={styles.ajusteTexto}>{uid === yo ? 'Tú' : nombreDe(p, !p)}</Text>
                {esAdmin && <Text style={styles.admin}>Admin</Text>}
                {uid !== yo && <IconDots size={20} color={COLORS.textMuted} />}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.tarjeta, { marginTop: 16 }]}>
          <Pressable
            style={styles.ajuste}
            onPress={() => setDenuncia({ tipo: 'chat', contra: chat.id, ref: chat.id })}
          >
            <IconFlag size={22} color={COLORS.error} strokeWidth={2} />
            <Text style={[styles.ajusteTexto, { color: COLORS.error }]}>Denunciar el grupo</Text>
          </Pressable>
          <Pressable style={styles.ajuste} onPress={() => setConfirmarSalir(true)}>
            <IconLogout size={22} color={COLORS.error} strokeWidth={2} />
            <Text style={[styles.ajusteTexto, { color: COLORS.error }]}>Salir del grupo</Text>
          </Pressable>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <HojaAcciones
        visible={Boolean(miembroSel)}
        onCerrar={() => setMiembroSel(null)}
        acciones={
          miembroSel
            ? [
                ...(!soyAdmin || chat.admins?.includes(miembroSel)
                  ? []
                  : [
                      {
                        texto: 'Hacer administrador',
                        icono: (c: string) => <IconShieldCheck size={22} color={c} />,
                        onPress: () =>
                          void conError(
                            () => hacerAdmin(chat.id, miembroSel),
                            'No hemos podido hacerlo administrador.',
                          ),
                      },
                    ]),
                ...(!soyAdmin
                  ? []
                  : [
                      {
                        texto: 'Quitar del grupo',
                        icono: (c: string) => <IconUserMinus size={22} color={c} />,
                        peligro: true,
                        onPress: () =>
                          void conError(async () => {
                            await quitarMiembro(chat, miembroSel);
                            await avisarEnElChat(
                              `${nombreDe(perfiles[yo], true)} ha sacado a ${nombreDe(perfiles[miembroSel])} del grupo`,
                            );
                          }, 'No hemos podido quitarlo del grupo.'),
                      },
                    ]),
                {
                  texto: 'Denunciar',
                  icono: (c: string) => <IconFlag size={22} color={c} />,
                  peligro: true,
                  onPress: () =>
                    setDenuncia({
                      tipo: 'usuario',
                      contra: miembroSel,
                      ref: `${chat.id}/${miembroSel}`,
                    }),
                },
              ]
            : []
        }
      />

      <HojaDenuncia
        objeto={denuncia}
        titulo={
          denuncia?.tipo === 'chat'
            ? 'Denunciar el grupo'
            : `Denunciar a ${nombreDe(perfiles[denuncia?.contra ?? ''])}`
        }
        nombreBloqueo={
          denuncia?.tipo === 'usuario' ? nombreDe(perfiles[denuncia.contra]) : undefined
        }
        onCerrar={() => setDenuncia(null)}
      />

      <Modal
        visible={anadiendo}
        transparent
        animationType="slide"
        onRequestClose={() => setAnadiendo(false)}
      >
        <Pressable style={styles.fondoModal} onPress={() => setAnadiendo(false)} />
        <View style={[styles.hoja, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.hojaTitulo}>Añadir amigos</Text>
          {amigosFuera.length === 0 ? (
            <Text style={styles.texto}>Todos tus amigos ya están en el grupo.</Text>
          ) : (
            amigosFuera.map((a) => {
              const marcado = nuevos.includes(a.uid);
              return (
                <Pressable
                  key={a.uid}
                  style={styles.ajuste}
                  onPress={() =>
                    setNuevos((prev) =>
                      marcado ? prev.filter((u) => u !== a.uid) : [...prev, a.uid],
                    )
                  }
                >
                  <Avatar uri={a.fotoPerfil} nombre={a.username} tamano={40} />
                  <Text style={styles.ajusteTexto}>{a.username}</Text>
                  <View style={[styles.casilla, marcado && styles.casillaOn]}>
                    {marcado && <IconCheck size={16} color={COLORS.onAccent} strokeWidth={3} />}
                  </View>
                </Pressable>
              );
            })
          )}
          <Pressable
            style={[styles.boton, nuevos.length === 0 && { opacity: 0.4 }]}
            disabled={nuevos.length === 0}
            onPress={() => {
              const anadir = nuevos;
              setAnadiendo(false);
              setNuevos([]);
              void conError(async () => {
                await anadirMiembros(chat.id, anadir);
                const nombres = anadir
                  .map((u) => amigos.find((a) => a.uid === u)?.username ?? 'alguien')
                  .join(', ');
                await avisarEnElChat(`${nombreDe(perfiles[yo], true)} ha añadido a ${nombres}`);
              }, 'No hemos podido añadirlos.');
            }}
          >
            <Text style={styles.botonTexto}>Añadir</Text>
          </Pressable>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmarSalir}
        onClose={() => setConfirmarSalir(false)}
        onConfirm={() => {
          setConfirmarSalir(false);
          void conError(async () => {
            await avisarEnElChat(`${nombreDe(perfiles[yo], true)} ha salido del grupo`);
            await salirDelGrupo(chat);
            navigation.navigate('Main');
          }, 'No hemos podido sacarte del grupo.');
        }}
        title="Salir del grupo"
        message="Dejarás de recibir sus mensajes. Para volver, te tendrá que añadir un administrador."
        confirmText="Salir"
        iconName="exit-outline"
        fontFamily={FUENTES.texto}
      />
    </View>
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
    paddingBottom: 8,
  },
  cabeceraTitulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  portada: { alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 20 },
  emojiGrande: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(105,223,217,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(105,223,217,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombreGrupo: { color: COLORS.text, fontSize: 22, fontFamily: FUENTES.titulo },
  campoNombre: {
    minWidth: 200,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 17,
    fontFamily: FUENTES.texto,
  },
  texto: { color: COLORS.textMuted, fontSize: 14, fontFamily: FUENTES.texto, textAlign: 'center' },
  seccion: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: FUENTES.titulo,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  tarjeta: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 4,
  },
  ajuste: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ajusteTexto: { flex: 1, color: COLORS.text, fontSize: 16, fontFamily: FUENTES.texto },
  admin: { color: COLORS.accent, fontSize: 12, fontFamily: FUENTES.titulo },
  error: {
    color: COLORS.error,
    fontSize: 13,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    marginTop: 12,
  },
  fondoModal: { flex: 1, backgroundColor: 'rgba(2,6,23,0.65)' },
  hoja: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 4,
    maxHeight: '75%',
  },
  hojaTitulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo, marginBottom: 8 },
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
  boton: {
    marginTop: 12,
    height: 52,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { color: COLORS.onAccent, fontSize: 16, fontFamily: FUENTES.titulo },
});
