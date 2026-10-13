/**
 * ARCHIVO: screens/NotificacionesScreen.tsx
 * DESCRIPCIÓN: Qué avisos quieres recibir. Se guardan en privado/avisos y los respeta quien
 * envía el aviso (notificationService.notificarAUsuario).
 * Las solicitudes de amistad no avisan: quien la envía aún no es tu amigo y no puede leer tu
 * token (reglas). Por eso no hay interruptor para ellas.
 */
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { guardarPreferenciasAvisos, obtenerAvisos } from '../services/repositorioUsuarios';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';

type Prefs = { mensajes: boolean; solicitudes: boolean; match: boolean };
const POR_DEFECTO: Prefs = { mensajes: true, solicitudes: true, match: true };

export function NotificacionesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(POR_DEFECTO);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void obtenerAvisos(user.uid).then((a) => a?.notificaciones && setPrefs({ ...POR_DEFECTO, ...a.notificaciones }));
  }, [user]);

  const cambiar = (clave: keyof Prefs, valor: boolean) => {
    const antes = prefs;
    const siguiente = { ...prefs, [clave]: valor };
    setPrefs(siguiente);
    setError(null);
    guardarPreferenciasAvisos(siguiente).catch(() => {
      setPrefs(antes);
      setError('No se ha guardado el cambio. Revisa la conexión.');
    });
  };

  const fila = (clave: keyof Prefs, titulo: string, texto: string) => (
    <View style={styles.tarjeta}>
      <View style={{ flex: 1 }}>
        <Text style={styles.etiqueta}>{titulo}</Text>
        <Text style={styles.ayuda}>{texto}</Text>
      </View>
      <Switch
        value={prefs[clave]}
        onValueChange={(v) => cambiar(clave, v)}
        trackColor={{ false: '#334155', true: COLORS.primary }}
        thumbColor={prefs[clave] ? '#fff' : '#94a3b8'}
        accessibilityLabel={titulo}
      />
    </View>
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecera}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Volver">
          <IconChevronLeft size={28} color={COLORS.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.titulo}>Notificaciones</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 12 }}>
        {fila('mensajes', 'Mensajes', 'Cuando te escriben en un chat. Un chat silenciado no avisa nunca.')}
        {fila('match', 'Movie Match', 'Cuando te invitan a un Match y cuando termina.')}
        <Text style={styles.ayuda}>
          Si no te llega ningún aviso, revisa que VeoVeo tenga permiso de notificaciones en los ajustes del móvil.
        </Text>
        <Pressable onPress={() => void Linking.openSettings()}>
          <Text style={styles.enlace}>Abrir los ajustes del móvil</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12 },
  titulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  error: { color: COLORS.error, fontSize: 13, fontFamily: FUENTES.texto, textAlign: 'center', marginBottom: 8 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  etiqueta: { color: COLORS.text, fontSize: 16, fontFamily: FUENTES.titulo },
  ayuda: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: FUENTES.texto, marginTop: 2 },
  enlace: { color: COLORS.primary, fontSize: 14, fontFamily: FUENTES.seminegrita },
});
